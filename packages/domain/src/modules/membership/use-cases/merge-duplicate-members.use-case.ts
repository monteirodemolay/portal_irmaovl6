import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ValidationError, err, ok, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../repositories/member.repository';
import type { IMemberSituationRecordRepository } from '../repositories/member-situation-record.repository';
import type { IMemberPositionHistoryRepository } from '../repositories/member-position-history.repository';
import type { IBoardPositionAssignmentRepository } from '../../governance/repositories/board-position-assignment.repository';

export interface MergeDuplicateMembersDeps {
  memberRepository: IMemberRepository;
  situationRecordRepository: IMemberSituationRecordRepository;
  positionHistoryRepository: IMemberPositionHistoryRepository;
  assignmentRepository: IBoardPositionAssignmentRepository;
  clock: IClock;
}

export interface MergeDuplicateMembersReport {
  canonicalMemberId: string;
  cadastrosMesclados: number;
  historicoDeCargosReatribuido: number;
  situacoesReatribuidas: number;
  titularidadesReatribuidas: number;
  fotoAtualizada: boolean;
}

/**
 * Mescla cadastros duplicados de um mesmo Irmão (mesmo nome, gravado mais
 * de uma vez — ex.: uma importação histórica que rodou antes do nome bater
 * exatamente, ou dois administradores cadastrando ao mesmo tempo) num só
 * cadastro canônico, escolhido pelo Administrador via `ListDuplicateMembersUseCase`.
 * Nunca apaga histórico: todo `MemberPositionHistory`, `MemberSituationRecord`
 * e `BoardPositionAssignment` dos cadastros duplicados é reatribuído
 * (`memberId` → canônico) antes de arquivar (soft delete) o duplicado —
 * mesmo espírito de `SoftDeleteMemberUseCase`. Se o canônico ainda não tem
 * foto e algum duplicado tem, a foto é copiada pro canônico.
 */
export class MergeDuplicateMembersUseCase {
  constructor(private readonly deps: MergeDuplicateMembersDeps) {}

  async execute(
    ctx: AuthContext,
    canonicalMemberId: string,
    duplicateMemberIds: string[],
  ): Promise<Result<MergeDuplicateMembersReport>> {
    requirePermission(ctx, 'member:manage');

    const uniqueDuplicateIds = Array.from(new Set(duplicateMemberIds)).filter(
      (id) => id !== canonicalMemberId,
    );
    if (uniqueDuplicateIds.length === 0) {
      return err(new ValidationError('Selecione ao menos um cadastro duplicado para mesclar.'));
    }

    let canonical = await this.deps.memberRepository.findById(canonicalMemberId);
    if (!canonical || canonical.tenantId !== ctx.tenantId || canonical.deletedAt) {
      return err(new NotFoundError('Member', canonicalMemberId));
    }

    const now = this.deps.clock.now();
    let historicoDeCargosReatribuido = 0;
    let situacoesReatribuidas = 0;
    let titularidadesReatribuidas = 0;
    let fotoAtualizada = false;
    let cadastrosMesclados = 0;

    for (const duplicateId of uniqueDuplicateIds) {
      const duplicate = await this.deps.memberRepository.findById(duplicateId);
      if (!duplicate || duplicate.tenantId !== ctx.tenantId || duplicate.deletedAt) continue;

      const [history, situations, assignments] = await Promise.all([
        this.deps.positionHistoryRepository.listByMemberId(duplicateId),
        this.deps.situationRecordRepository.listByMemberId(duplicateId),
        this.deps.assignmentRepository.listByMemberId(duplicateId),
      ]);

      await Promise.all(
        history.map((entry) =>
          this.deps.positionHistoryRepository.update({
            ...entry,
            memberId: canonicalMemberId,
            updatedAt: now,
            updatedBy: ctx.uid,
          }),
        ),
      );
      historicoDeCargosReatribuido += history.length;

      await Promise.all(
        situations.map((record) =>
          this.deps.situationRecordRepository.update({
            ...record,
            memberId: canonicalMemberId,
            updatedAt: now,
            updatedBy: ctx.uid,
          }),
        ),
      );
      situacoesReatribuidas += situations.length;

      await Promise.all(
        assignments.map((assignment) =>
          this.deps.assignmentRepository.update({
            ...assignment,
            memberId: canonicalMemberId,
            updatedAt: now,
            updatedBy: ctx.uid,
          }),
        ),
      );
      titularidadesReatribuidas += assignments.length;

      if (!canonical.fotoUrl && duplicate.fotoUrl) {
        canonical = {
          ...canonical,
          fotoUrl: duplicate.fotoUrl,
          updatedAt: now,
          updatedBy: ctx.uid,
        };
        fotoAtualizada = true;
      }

      await this.deps.memberRepository.update({
        ...duplicate,
        deletedAt: now,
        status: 'archived',
        ativo: false,
        observacoes: [
          duplicate.observacoes,
          `Cadastro mesclado em ${canonicalMemberId} (duplicidade) em ${now.toISOString()}.`,
        ]
          .filter(Boolean)
          .join('\n'),
        updatedAt: now,
        updatedBy: ctx.uid,
      });
      cadastrosMesclados += 1;
    }

    if (fotoAtualizada) {
      await this.deps.memberRepository.update(canonical);
    }

    return ok({
      canonicalMemberId,
      cadastrosMesclados,
      historicoDeCargosReatribuido,
      situacoesReatribuidas,
      titularidadesReatribuidas,
      fotoAtualizada,
    });
  }
}
