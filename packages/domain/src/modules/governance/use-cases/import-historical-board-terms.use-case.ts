import type { BoardPositionKey } from '@vl6/shared';
import { normalizeNameForSearch } from '@vl6/shared';
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
  memberStatus: 'criado' | 'já existia';
  fotoAtualizada: boolean;
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

    const existingMembers = await this.loadAllMembers(ctx.tenantId);
    const memberByName = new Map(
      existingMembers.map((member) => [normalizeNameForSearch(member.nomeCompleto), member]),
    );
    const existingTerms = await this.deps.boardTermRepository.listByTenant(ctx.tenantId);
    const termByName = new Map(
      existingTerms.map((term) => [normalizeNameForSearch(term.nome), term]),
    );

    const report: ImportHistoricalBoardTermsRow[] = [];

    for (const termInput of terms) {
      const now = this.deps.clock.now();
      let boardTerm = termByName.get(normalizeNameForSearch(termInput.nome));
      let gestaoStatus: 'criada' | 'já existia' = 'já existia';
      if (!boardTerm) {
        boardTerm = {
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
        termByName.set(normalizeNameForSearch(boardTerm.nome), boardTerm);
        gestaoStatus = 'criada';
      }

      const segmentsByCargo = new Map<BoardPositionKey, typeof termInput.segments>();
      for (const segment of termInput.segments) {
        const list = segmentsByCargo.get(segment.cargo) ?? [];
        list.push(segment);
        segmentsByCargo.set(segment.cargo, list);
      }

      for (const [cargo, segments] of segmentsByCargo) {
        const ordered = [...segments].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio));

        for (const segment of ordered) {
          const normalized = normalizeNameForSearch(segment.nomeCompleto);
          let member = memberByName.get(normalized);
          let memberStatus: 'criado' | 'já existia' = 'já existia';
          let fotoAtualizada = false;

          if (!member) {
            const fotoUrl = photosByNormalizedName[normalized] ?? null;
            member = await this.createHistoricalMember(ctx, segment.nomeCompleto, fotoUrl, now);
            memberByName.set(normalized, member);
            memberStatus = 'criado';
            fotoAtualizada = fotoUrl !== null;
          } else if (!member.fotoUrl && photosByNormalizedName[normalized]) {
            member = {
              ...member,
              fotoUrl: photosByNormalizedName[normalized]!,
              updatedAt: now,
              updatedBy: ctx.uid,
            };
            await this.deps.memberRepository.update(member);
            memberByName.set(normalized, member);
            fotoAtualizada = true;
          }

          const history: MemberPositionHistory = {
            id: this.deps.idGenerator.next(),
            tenantId: ctx.tenantId,
            memberId: member.id,
            cargo,
            gestaoId: boardTerm.id,
            dataInicio: new Date(segment.dataInicio),
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
          await this.deps.positionHistoryRepository.create(history);

          report.push({
            gestaoNome: boardTerm.nome,
            gestaoStatus,
            cargo,
            nomeCompleto: segment.nomeCompleto,
            memberStatus,
            fotoAtualizada,
          });
        }

        const lastSegment = ordered[ordered.length - 1]!;
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
      }
    }

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
