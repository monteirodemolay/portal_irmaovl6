import type { BoardPositionKey } from '@vl6/shared';
import { findSimilarName, normalizeNameForSearch } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { Member } from '../../membership/entities/member.entity';
import type { MemberSituationRecord } from '../../membership/entities/member-situation-record.entity';
import type { MemberPositionHistory } from '../../membership/entities/member-position-history.entity';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IMemberSituationRecordRepository } from '../../membership/repositories/member-situation-record.repository';
import type { IMemberPositionHistoryRepository } from '../../membership/repositories/member-position-history.repository';
import type { BoardPositionAssignment } from '../entities/board-position-assignment.entity';
import type { BoardTerm } from '../entities/board-term.entity';
import type { IBoardTermRepository } from '../repositories/board-term.repository';
import type { IBoardPositionAssignmentRepository } from '../repositories/board-position-assignment.repository';
import type { HistoricalBoardTermInput } from '../lib/historical-board-terms-vl6';

export interface ImportHistoricalBoardTermsDeps {
  memberRepository: IMemberRepository;
  situationRecordRepository: IMemberSituationRecordRepository;
  positionHistoryRepository: IMemberPositionHistoryRepository;
  boardTermRepository: IBoardTermRepository;
  assignmentRepository: IBoardPositionAssignmentRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface ImportHistoricalBoardTermsRow {
  gestaoNome: string;
  gestaoStatus: 'criada' | 'já existia';
  cargo: BoardPositionKey;
  nomeCompleto: string;
  /** `'revisar'` — nome parecido demais com um Irmão já cadastrado pra criar
   * sozinho: nada foi criado nem vinculado pra este segmento, ver
   * `sugestaoNomeParecido`. */
  memberStatus: 'criado' | 'já existia' | 'revisar';
  fotoAtualizada: boolean;
  /** Só preenchido quando `memberStatus === 'revisar'` — nome do Irmão já cadastrado que pode ser a mesma pessoa. */
  sugestaoNomeParecido?: string | null;
}

/**
 * Importação única, disparada pelo Administrador (`/admin/pessoas/gestoes/
 * importar-nominata`), da nominata histórica de Veneráveis/Vigilantes
 * fornecida pela Secretaria (`historical-board-terms-vl6.ts`). Idempotente:
 * rodar de novo não duplica nada — gestões e Irmãos já existentes são
 * casados por nome (normalizado, sem acento/maiúscula) em vez de recriados.
 *
 * Diferente de `AssignBoardPositionUseCase` (que sempre usa `now()`, feito
 * pra registrar QUEM ESTÁ no cargo agora): aqui as datas são as históricas
 * reais, vindas do dataset — nunca `clock.now()` como `dataInicio`. Todo
 * Irmão criado aqui nasce `situacao: 'ativo'` mesmo quando historicamente
 * muito antigo — decisão do Administrador (não presumir falecimento sem
 * confirmação, evita marcar por engano alguém que ainda está vivo).
 *
 * Nunca cria um cadastro novo sem antes conferir se não é o MESMO Irmão já
 * cadastrado com o nome grafado ligeiramente diferente (`findSimilarName`
 * — distância de edição pequena, ex.: "Ivan" × "Ivam", um erro de
 * digitação típico da nominata em papel). Quando acha um nome parecido
 * (mas não idêntico) a um Irmão já existente, NÃO cria nada pra esse
 * segmento — devolve `memberStatus: 'revisar'` no relatório com o nome
 * sugerido, pro Administrador decidir manualmente (corrigir a grafia no
 * dataset e reimportar, ou confirmar que são pessoas diferentes e cadastrar
 * à parte). Cadastro duplicado desfaz vínculo — sempre errar pro lado de
 * pedir confirmação, nunca pro lado de criar sozinho.
 */
export class ImportHistoricalBoardTermsUseCase {
  constructor(private readonly deps: ImportHistoricalBoardTermsDeps) {}

  async execute(
    ctx: AuthContext,
    terms: HistoricalBoardTermInput[],
    /** Mapa nome-normalizado → URL da foto já enviada (upload acontece na Server Action, fora do domínio). */
    photosByNormalizedName: Record<string, string>,
  ): Promise<Result<ImportHistoricalBoardTermsRow[]>> {
    requirePermission(ctx, 'boardTerm:manage');

    const now = this.deps.clock.now();

    const [existingMembers, existingTerms, existingHistory] = await Promise.all([
      this.loadAllMembers(ctx.tenantId),
      this.deps.boardTermRepository.listByTenant(ctx.tenantId),
      this.deps.positionHistoryRepository.listByTenant(ctx.tenantId),
    ]);
    const memberByName = new Map(
      existingMembers.map((member) => [normalizeNameForSearch(member.nomeCompleto), member]),
    );
    const termByName = new Map(
      existingTerms.map((term) => [normalizeNameForSearch(term.nome), term]),
    );
    // Chave memberId|cargo|gestaoId|dataInicio (ISO) — permite rodar a
    // importação quantas vezes for preciso sem duplicar o mesmo vínculo.
    const historyKey = (memberId: string, cargo: string, gestaoId: string, dataInicio: Date) =>
      `${memberId}|${cargo}|${gestaoId}|${dataInicio.toISOString()}`;
    const existingHistoryKeys = new Set(
      existingHistory.map((h) => historyKey(h.memberId, h.cargo, h.gestaoId, h.dataInicio)),
    );

    // Fase 1: resolve/cria todos os Irmãos únicos da nominata em paralelo —
    // uma promise por nome (nunca duas pro mesmo nome), então sem risco de
    // duplicar mesmo com Promise.all. Nomes existentes (pré-Fase 1) usados
    // como base pra checagem de nome parecido, nunca contra cadastros
    // criados durante esta própria execução.
    const existingNames = existingMembers.map((m) => m.nomeCompleto);
    const needsReviewByName = new Map<string, string>(); // nome-normalizado → sugestão (nome existente parecido)

    const allSegments = terms.flatMap((term) => term.segments);
    const uniqueNames = Array.from(new Set(allSegments.map((s) => s.nomeCompleto)));
    await Promise.all(
      uniqueNames.map(async (nomeCompleto) => {
        const normalized = normalizeNameForSearch(nomeCompleto);
        const member = memberByName.get(normalized);
        if (!member) {
          const suggestion = findSimilarName(nomeCompleto, existingNames);
          if (suggestion) {
            needsReviewByName.set(normalized, suggestion);
            return;
          }
          const fotoUrl = photosByNormalizedName[normalized] ?? null;
          const created = await this.createHistoricalMember(ctx, nomeCompleto, fotoUrl, now);
          memberByName.set(normalized, created);
        } else if (!member.fotoUrl && photosByNormalizedName[normalized]) {
          const updated = {
            ...member,
            fotoUrl: photosByNormalizedName[normalized]!,
            updatedAt: now,
            updatedBy: ctx.uid,
          };
          await this.deps.memberRepository.update(updated);
          memberByName.set(normalized, updated);
        }
      }),
    );

    // Fase 2: cria as Gestões que ainda não existem, em paralelo — cada
    // termo é independente.
    const gestaoStatusByName = new Map<string, 'criada' | 'já existia'>();
    await Promise.all(
      terms.map(async (termInput) => {
        const key = normalizeNameForSearch(termInput.nome);
        if (termByName.has(key)) {
          gestaoStatusByName.set(key, 'já existia');
          return;
        }
        const boardTerm: BoardTerm = {
          id: this.deps.idGenerator.next(),
          tenantId: ctx.tenantId,
          nome: termInput.nome,
          periodoInicio: new Date(termInput.periodoInicio),
          periodoFim: new Date(termInput.periodoFim),
          createdAt: now,
          updatedAt: now,
          createdBy: ctx.uid,
          updatedBy: ctx.uid,
          deletedAt: null,
          status: 'active',
          ativo: true,
        };
        await this.deps.boardTermRepository.create(boardTerm);
        termByName.set(key, boardTerm);
        gestaoStatusByName.set(key, 'criada');
      }),
    );

    // Fase 3: cria todo o histórico de cargos (MemberPositionHistory) em
    // paralelo — cada entrada é uma escrita independente.
    const report: ImportHistoricalBoardTermsRow[] = [];
    const historyWrites: Array<Promise<void>> = [];

    interface CargoGroup {
      boardTerm: BoardTerm;
      gestaoStatus: 'criada' | 'já existia';
      cargo: BoardPositionKey;
      ordered: HistoricalBoardTermInput['segments'];
    }
    const cargoGroups: CargoGroup[] = [];

    for (const termInput of terms) {
      const termKey = normalizeNameForSearch(termInput.nome);
      const boardTerm = termByName.get(termKey)!;
      const gestaoStatus = gestaoStatusByName.get(termKey)!;

      const segmentsByCargo = new Map<BoardPositionKey, typeof termInput.segments>();
      for (const segment of termInput.segments) {
        const list = segmentsByCargo.get(segment.cargo) ?? [];
        list.push(segment);
        segmentsByCargo.set(segment.cargo, list);
      }

      for (const [cargo, segments] of segmentsByCargo) {
        const ordered = [...segments].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));
        cargoGroups.push({ boardTerm, gestaoStatus, cargo, ordered });

        for (const segment of ordered) {
          const normalized = normalizeNameForSearch(segment.nomeCompleto);
          const suggestion = needsReviewByName.get(normalized);
          if (suggestion) {
            report.push({
              gestaoNome: boardTerm.nome,
              gestaoStatus,
              cargo,
              nomeCompleto: segment.nomeCompleto,
              memberStatus: 'revisar',
              fotoAtualizada: false,
              sugestaoNomeParecido: suggestion,
            });
            continue;
          }

          const member = memberByName.get(normalized)!;
          const dataInicio = new Date(segment.dataInicio);
          const key = historyKey(member.id, cargo, boardTerm.id, dataInicio);

          if (existingHistoryKeys.has(key)) {
            report.push({
              gestaoNome: boardTerm.nome,
              gestaoStatus,
              cargo,
              nomeCompleto: segment.nomeCompleto,
              memberStatus: 'criado',
              fotoAtualizada: false,
            });
            continue;
          }
          existingHistoryKeys.add(key);

          const history: MemberPositionHistory = {
            id: this.deps.idGenerator.next(),
            tenantId: ctx.tenantId,
            memberId: member.id,
            cargo,
            gestaoId: boardTerm.id,
            dataInicio,
            dataFim: new Date(segment.dataFim),
            observacoes: null,
            createdAt: now,
            updatedAt: now,
            createdBy: ctx.uid,
            updatedBy: ctx.uid,
            deletedAt: null,
            status: 'active',
            ativo: true,
          };
          historyWrites.push(this.deps.positionHistoryRepository.create(history).then(() => {}));

          // memberStatus/fotoAtualizada preenchidos depois, com base no que
          // cada Irmão era ANTES da Fase 1 (ver loop logo após o Promise.all
          // das escritas de histórico).
          report.push({
            gestaoNome: boardTerm.nome,
            gestaoStatus,
            cargo,
            nomeCompleto: segment.nomeCompleto,
            memberStatus: 'criado',
            fotoAtualizada: false,
          });
        }
      }
    }
    await Promise.all(historyWrites);

    // memberStatus/fotoAtualizada do relatório: recalcula com base no que
    // cada Irmão era ANTES da Fase 1 (existingMembers), não no estado atual.
    const originalNames = new Set(
      existingMembers.map((m) => normalizeNameForSearch(m.nomeCompleto)),
    );
    const originalPhotoless = new Set(
      existingMembers.filter((m) => !m.fotoUrl).map((m) => normalizeNameForSearch(m.nomeCompleto)),
    );
    for (const row of report) {
      if (row.memberStatus === 'revisar') continue;
      const normalized = normalizeNameForSearch(row.nomeCompleto);
      row.memberStatus = originalNames.has(normalized) ? 'já existia' : 'criado';
      row.fotoAtualizada =
        photosByNormalizedName[normalized] !== undefined &&
        (!originalNames.has(normalized) || originalPhotoless.has(normalized));
    }

    // Fase 4: upsert dos BoardPositionAssignment (quem ocupa o cargo hoje
    // nessa gestão) — um por gestão+cargo, todos independentes entre si.
    await Promise.all(
      cargoGroups.map(async ({ boardTerm, cargo, ordered }) => {
        const resolvedOrdered = ordered.filter(
          (segment) => !needsReviewByName.has(normalizeNameForSearch(segment.nomeCompleto)),
        );
        if (resolvedOrdered.length === 0) return; // tudo pendente de revisão — nada pra atribuir ainda

        const lastSegment = resolvedOrdered[resolvedOrdered.length - 1]!;
        const lastMember = memberByName.get(normalizeNameForSearch(lastSegment.nomeCompleto))!;
        const existingAssignment = await this.deps.assignmentRepository.findByGestaoAndCargo(
          boardTerm.id,
          cargo,
        );
        if (!existingAssignment) {
          const assignment: BoardPositionAssignment = {
            id: this.deps.idGenerator.next(),
            tenantId: ctx.tenantId,
            gestaoId: boardTerm.id,
            cargo,
            memberId: lastMember.id,
            ordem: 1,
            createdAt: now,
            updatedAt: now,
            createdBy: ctx.uid,
            updatedBy: ctx.uid,
            deletedAt: null,
            status: 'active',
            ativo: true,
          };
          await this.deps.assignmentRepository.create(assignment);
        } else if (existingAssignment.memberId !== lastMember.id) {
          await this.deps.assignmentRepository.update({
            ...existingAssignment,
            memberId: lastMember.id,
            updatedAt: now,
            updatedBy: ctx.uid,
          });
        }
      }),
    );

    return ok(report);
  }

  private async createHistoricalMember(
    ctx: AuthContext,
    nomeCompleto: string,
    fotoUrl: string | null,
    now: Date,
  ): Promise<Member> {
    const member: Member = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      userId: null,
      nomeCompleto,
      fotoUrl,
      email: null,
      telefone: null,
      whatsapp: null,
      endereco: null,
      dataNascimento: null,
      dataIniciacao: null,
      dataElevacao: null,
      dataExaltacao: null,
      cim: null,
      // Ocupar cargo de Diretoria pressupõe 3º grau — presunção documentada,
      // ajustável depois pelo Administrador se algum caso for diferente.
      grau: 'mestre',
      cargoAtualId: null,
      situacao: 'ativo',
      dataFalecimento: null,
      mensagemHomenagem: null,
      lojaId: ctx.tenantId,
      potencia: 'GLEG',
      profissao: null,
      empresa: null,
      estadoCivil: null,
      conjugeNome: null,
      conjugeDataNascimento: null,
      biografia: null,
      redesSociais: { instagram: null, facebook: null, linkedin: null },
      observacoes:
        'Cadastro criado pela importação da nominata histórica (1947–2026) — revisar dados e situação.',
      autorizaDivulgacaoExterna: false,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.memberRepository.create(member);

    const situationRecord: MemberSituationRecord = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      memberId: member.id,
      situacao: 'ativo',
      motivo: 'outro',
      motivoOutroDescricao: 'Cadastro histórico institucional — nominata 1947–2026.',
      dataInicio: now,
      dataFim: null,
      lojaId: member.lojaId,
      potencia: member.potencia,
      documentoNumero: null,
      documentoData: null,
      observacoes: null,
      anexos: [],
      vigente: true,
      dataInicioEstimada: true,
      justificativaEdicaoRetroativa: null,
      origem: null,
      sourceCode: null,
      sourceLabel: null,
      recordKind: null,
      lojaOrigemId: null,
      lojaDestinoId: null,
      importBatchId: 'nominata-historica-1947-2026',
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.situationRecordRepository.create(situationRecord);

    return member;
  }

  private async loadAllMembers(tenantId: string): Promise<Member[]> {
    const all: Member[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await this.deps.memberRepository.search({ tenantId }, { limit: 100, cursor });
      all.push(...page.items);
      if (!page.hasMore || !page.nextCursor) break;
      cursor = page.nextCursor;
    }
    return all;
  }
}
