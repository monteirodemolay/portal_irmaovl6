import { formatSessionName } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { Address } from '../../../shared/address';
import type { Event } from '../../agenda/entities/event.entity';
import type { IEventRepository } from '../../agenda/repositories/event.repository';
import type { IBoardTermRepository } from '../../governance/repositories/board-term.repository';
import type { ITenantRepository } from '../../tenancy/repositories/tenant.repository';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';

export interface CreateExaltationArchiveItemInput {
  memberId: string;
  nomeCompleto: string;
  dataExaltacao: Date;
}

export interface CreateExaltationArchiveItemDeps {
  archiveItemRepository: IArchiveItemRepository;
  eventRepository: IEventRepository;
  boardTermRepository: IBoardTermRepository;
  tenantRepository: ITenantRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

function formatAddress(address: Address): string {
  const linha1 = [address.logradouro, address.numero].filter(Boolean).join(', ');
  const linha2 = [address.bairro, [address.cidade, address.estado].filter(Boolean).join('/')]
    .filter(Boolean)
    .join(' - ');
  return [linha1, linha2].filter(Boolean).join(' - ');
}

export interface CreateExaltationArchiveItemResult {
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
 * exaltação (3º grau, Mestre) de um Irmão — mesmo espírito de
 * `CreateInitiationArchiveItemUseCase`/`CreateElevationArchiveItemUseCase`
 * (docs/architecture/11-acervo-vl6.md §11.5), cobrindo o terceiro marco da
 * trajetória maçônica: sempre que a `Member.dataExaltacao` de um Irmão é
 * registrada, nasce (ou é reaproveitada) a entrada correspondente no Acervo
 * VL6, agrupada por Evento — Irmãos exaltados na mesma sessão compartilham
 * o mesmo `Event`, permitindo ver quem se exaltou junto.
 *
 * Fluxo idêntico ao da iniciação/elevação, só muda o marcador de
 * proveniência (`origemExaltacaoMemberId`), o grau do Evento criado
 * (`mestre`) e os textos.
 */
export class CreateExaltationArchiveItemUseCase {
  constructor(private readonly deps: CreateExaltationArchiveItemDeps) {}

  async execute(
    ctx: AuthContext,
    input: CreateExaltationArchiveItemInput,
  ): Promise<CreateExaltationArchiveItemResult> {
    const existing = await this.deps.archiveItemRepository.findByOrigemExaltacaoMemberId(
      ctx.tenantId,
      input.memberId,
    );
    if (existing) {
      return { archiveItem: existing, created: false, eventCreated: false };
    }

    const from = startOfDay(input.dataExaltacao);
    const to = endOfDay(input.dataExaltacao);
    const eventsOnDate = await this.deps.eventRepository.listInRange(ctx.tenantId, from, to);

    const now = this.deps.clock.now();
    let event: Event | undefined = eventsOnDate[0];
    let eventCreated = false;

    if (!event) {
      const [boardTerm, tenant] = await Promise.all([
        this.deps.boardTermRepository.findByDate(ctx.tenantId, input.dataExaltacao),
        this.deps.tenantRepository.findById(ctx.tenantId),
      ]);
      const local = tenant?.endereco ? formatAddress(tenant.endereco) : 'A confirmar';
      const nomeLoja = tenant?.nome ?? 'da Loja';
      event = {
        id: this.deps.idGenerator.next(),
        tenantId: ctx.tenantId,
        tipo: 'sessao',
        titulo: `${formatSessionName({ sessionType: 'magna', sessionNature: 'exaltacao' })} — ${formatDateBR(input.dataExaltacao)}`,
        descricao: null,
        local,
        dataInicio: input.dataExaltacao,
        dataFim: null,
        exigeConfirmacaoPresenca: false,
        capacidadeMaxima: null,
        traje: null,
        chegadaSugerida: null,
        observacoes:
          'Evento criado automaticamente pelo Acervo VL6 a partir do registro da data de ' +
          `exaltação de ${input.nomeCompleto} ${nomeLoja === 'da Loja' ? nomeLoja : 'na ' + nomeLoja} — ` +
          'sem outro evento cadastrado nesta data.',
        arquivosRelacionados: [],
        boardTermId: boardTerm?.id ?? null,
        nivelAcesso: 'irmaos',
        exibirNaLinhaDoTempo: true,
        grau: 'mestre',
        sessionType: 'magna',
        sessionNature: 'exaltacao',
        degreeWork: 'mestre',
        access: 'privativa_macons',
        isJointSession: false,
        participatingLodges: [],
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
      titulo: `Exaltação de ${input.nomeCompleto}`,
      tipo: 'outro',
      descricao:
        `Registro automático da exaltação de ${input.nomeCompleto} no Acervo VL6, criado a ` +
        'partir da data de exaltação informada no cadastro do Irmão. Ao anexar fotos ou ' +
        'documentos desta sessão, marque este Irmão como pessoa identificada na mídia.',
      nivelAcesso: event.nivelAcesso,
      publicacaoStatus: 'rascunho',
      capaMediaId: null,
      origemExaltacaoMemberId: input.memberId,
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
