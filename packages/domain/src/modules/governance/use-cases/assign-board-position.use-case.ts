import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IMemberPositionHistoryRepository } from '../../membership/repositories/member-position-history.repository';
import type { MemberPositionHistory } from '../../membership/entities/member-position-history.entity';
import type { BoardPositionAssignment } from '../entities/board-position-assignment.entity';
import type { IBoardTermRepository } from '../repositories/board-term.repository';
import type { IBoardPositionAssignmentRepository } from '../repositories/board-position-assignment.repository';

export interface AssignBoardPositionInput {
  gestaoId: string;
  /** Chave de `BOARD_POSITION_KEYS` ou um cargo extra digitado pelo usuário. */
  cargo: string;
  memberId: string;
  ordem: number;
}

export interface AssignBoardPositionDeps {
  boardTermRepository: IBoardTermRepository;
  assignmentRepository: IBoardPositionAssignmentRepository;
  memberRepository: IMemberRepository;
  positionHistoryRepository: IMemberPositionHistoryRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Atribui um Irmão a um cargo da Diretoria dentro de uma gestão. `cargo`
 * aceita tanto uma chave de BOARD_POSITION_KEYS quanto um cargo extra
 * digitado pelo usuário (ex.: novos cargos de oficiais). Para cargos de
 * ocorrência única (todos exceto Diácono/Experto), substitui quem estava no cargo,
 * encerrando o histórico do titular anterior. Sempre grava uma entrada em
 * `memberPositionHistory` e atualiza `Member.cargoAtualId` do novo titular
 * — docs/architecture/06-regras-negocio.md §6.2.
 */
export class AssignBoardPositionUseCase {
  constructor(private readonly deps: AssignBoardPositionDeps) {}

  async execute(
    ctx: AuthContext,
    input: AssignBoardPositionInput,
  ): Promise<Result<BoardPositionAssignment>> {
    requirePermission(ctx, 'boardTerm:manage');

    const [term, member] = await Promise.all([
      this.deps.boardTermRepository.findById(input.gestaoId),
      this.deps.memberRepository.findById(input.memberId),
    ]);
    if (!term || term.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('BoardTerm', input.gestaoId));
    }
    if (!member || member.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Member', input.memberId));
    }

    const now = this.deps.clock.now();
    const isSingleOccurrence = input.cargo !== 'diacono' && input.cargo !== 'experto';

    let assignment: BoardPositionAssignment;

    if (isSingleOccurrence) {
      const existing = await this.deps.assignmentRepository.findByGestaoAndCargo(
        input.gestaoId,
        input.cargo,
      );
      if (existing && existing.memberId !== input.memberId) {
        await this.closeActivePosition(existing.memberId, ctx);
      }
      if (existing) {
        assignment = { ...existing, memberId: input.memberId, updatedAt: now, updatedBy: ctx.uid };
        await this.deps.assignmentRepository.update(assignment);
      } else {
        assignment = this.newAssignment(ctx, input, now);
        await this.deps.assignmentRepository.create(assignment);
      }
    } else {
      assignment = this.newAssignment(ctx, input, now);
      await this.deps.assignmentRepository.create(assignment);
    }

    const historyEntry: MemberPositionHistory = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      memberId: input.memberId,
      cargo: input.cargo,
      gestaoId: input.gestaoId,
      dataInicio: now,
      dataFim: null,
      observacoes: null,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.positionHistoryRepository.create(historyEntry);

    await this.deps.memberRepository.update({
      ...member,
      cargoAtualId: assignment.id,
      updatedAt: now,
      updatedBy: ctx.uid,
    });

    return ok(assignment);
  }

  private newAssignment(
    ctx: AuthContext,
    input: AssignBoardPositionInput,
    now: Date,
  ): BoardPositionAssignment {
    return {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      gestaoId: input.gestaoId,
      cargo: input.cargo,
      memberId: input.memberId,
      ordem: input.ordem,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
  }

  private async closeActivePosition(memberId: string, ctx: AuthContext): Promise<void> {
    const active = await this.deps.positionHistoryRepository.findActiveByMemberId(memberId);
    if (!active) return;

    const now = this.deps.clock.now();
    await this.deps.positionHistoryRepository.update({
      ...active,
      dataFim: now,
      updatedAt: now,
      updatedBy: ctx.uid,
    });

    const previousMember = await this.deps.memberRepository.findById(memberId);
    if (previousMember?.cargoAtualId) {
      await this.deps.memberRepository.update({
        ...previousMember,
        cargoAtualId: null,
        updatedAt: now,
        updatedBy: ctx.uid,
      });
    }
  }
}
