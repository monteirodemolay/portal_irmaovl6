import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { Event } from '../../agenda/entities/event.entity';
import type { IEventRepository } from '../../agenda/repositories/event.repository';
import type { IBoardTermRepository } from '../../governance/repositories/board-term.repository';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';

export interface CreateInitiationArchiveItemInput {
  memberId: string;
  nomeCompleto: string;
  dataIniciacao: Date;
}

export interface CreateInitiationArchiveItemDeps {
  archiveItemRepository: IArchiveItemRepository;
  eventRepository: IEventRepository;
  boardTermRepository: IBoardTermRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface CreateInitiationArchiveItemResult {
  archiveItem: ArchiveItem;
  /** `true` só quando este `execute` de fato criou o item — `false` quando já existia (idempotência). */
  created: boolean;
  /** `true` quando também foi preciso criar um `Event` novo (nenhum evento na data). */
  eventCreated: boolean;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/**
 * Cria (de forma idempotente) o `ArchiveItem` de "memória institucional" da
 * iniciação de um Irmão — objetivo central da automação descrita em
 * docs/architecture/11-acervo-vl6.md: toda vez que a `Member.dataIniciacao`
 * de um Irmão é registrada, nasce uma entrada correspondente no Acervo VL6.
 *
 * Fluxo:
 * 1. Idempotência primeiro — se já existe um `ArchiveItem` com
 *    `origemIniciacaoMemberId` apontando pra este Irmão
 *    (`IArchiveItemRepository.findByOrigemIniciacaoMemberId`), não faz mais
 *    nada e devolve o item já existente (`created: false`).
 * 2. Procura um `Event` já cadastrado na Agenda na mesma data (mesmo
 *    tenant, ignorando hora — `IEventRepository.listInRange` do início ao
 *    fim do dia). Se achar mais de um, usa o primeiro (ordem de
 *    `dataInicio`, já crescente no repositório).
 * 3. Se não achar nenhum, cria um `Event` mínimo do tipo Sessão (grau
 *    Aprendiz — toda iniciação maçônica ocorre em grau de Aprendiz) só com
 *    os campos necessários pra ser válido, com a Gestão vigente resolvida
 *    do mesmo jeito que `CreateEventUseCase` (`IBoardTermRepository
 *    .findByDate`). Este Evento nunca é apagado por este caso de uso.
 * 4. Cria o `ArchiveItem` vinculado ao evento (achado ou criado), sempre
 *    `publicacaoStatus: 'rascunho'` — nunca publica sozinho.
 *
 * Este caso de uso deliberadamente NÃO chama `requirePermission` — é um
 * efeito colateral interno, sempre disparado depois que quem chamou já
 * teve sua própria permissão checada (`member:create`/`member:update` no
 * cadastro/edição do Irmão, `member:manage` no backfill
 * `SeedInitiationArchiveItemsUseCase`), mesmo espírito do
 * `MemberSituationRecord` criado dentro de `RegisterMemberUseCase` sem uma
 * checagem de permissão própria.
 */
export class CreateInitiationArchiveItemUseCase {
  constructor(private readonly deps: CreateInitiationArchiveItemDeps) {}

  async execute(
    ctx: AuthContext,
    input: CreateInitiationArchiveItemInput,
  ): Promise<CreateInitiationArchiveItemResult> {
    const existing = await this.deps.archiveItemRepository.findByOrigemIniciacaoMemberId(
      ctx.tenantId,
      input.memberId,
    );
    if (existing) {
      return { archiveItem: existing, created: false, eventCreated: false };
    }

    const from = startOfDay(input.dataIniciacao);
    const to = endOfDay(input.dataIniciacao);
    const eventsOnDate = await this.deps.eventRepository.listInRange(ctx.tenantId, from, to);

    const now = this.deps.clock.now();
    let event: Event | undefined = eventsOnDate[0];
    let eventCreated = false;

    if (!event) {
      const boardTerm = await this.deps.boardTermRepository.findByDate(
        ctx.tenantId,
        input.dataIniciacao,
      );
      event = {
        id: this.deps.idGenerator.next(),
        tenantId: ctx.tenantId,
        tipo: 'sessao',
        titulo: `Sessão de Iniciação — ${formatDateBR(input.dataIniciacao)}`,
        descricao: null,
        local: 'A confirmar',
        dataInicio: input.dataIniciacao,
        dataFim: null,
        exigeConfirmacaoPresenca: false,
        capacidadeMaxima: null,
        traje: null,
        chegadaSugerida: null,
        observacoes:
          'Evento criado automaticamente pelo Acervo VL6 a partir do registro da data de ' +
          `iniciação de ${input.nomeCompleto} — sem outro evento cadastrado nesta data.`,
        arquivosRelacionados: [],
        boardTermId: boardTerm?.id ?? null,
        nivelAcesso: 'irmaos',
        exibirNaLinhaDoTempo: true,
        grau: 'aprendiz',
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.uid,
        updatedBy: ctx.uid,
        deletedAt: null,
        status: 'active',
        ativo: true,
      };
      await this.deps.eventRepository.create(event);
      eventCreated = true;
    }

    const archiveItem: ArchiveItem = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      eventId: event.id,
      boardTermId: event.boardTermId,
      titulo: `Iniciação de ${input.nomeCompleto}`,
      tipo: 'outro',
      descricao:
        `Registro automático da iniciação de ${input.nomeCompleto} no Acervo VL6, criado a ` +
        'partir da data de iniciação informada no cadastro do Irmão. Ao anexar fotos ou ' +
        'documentos desta sessão, marque este Irmão como pessoa identificada na mídia.',
      nivelAcesso: event.nivelAcesso,
      publicacaoStatus: 'rascunho',
      capaMediaId: null,
      origemIniciacaoMemberId: input.memberId,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'draft',
      ativo: true,
    };
    await this.deps.archiveItemRepository.create(archiveItem);

    return { archiveItem, created: true, eventCreated };
  }
}
