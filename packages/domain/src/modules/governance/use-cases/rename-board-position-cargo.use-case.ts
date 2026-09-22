import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ConflictError, ok, err, type Result } from '../../../shared/result';
import type { IMemberPositionHistoryRepository } from '../../membership/repositories/member-position-history.repository';
import type { BoardPositionAssignment } from '../entities/board-position-assignment.entity';
import type { IBoardPositionAssignmentRepository } from '../repositories/board-position-assignment.repository';

export interface RenameBoardPositionCargoInput {
  assignmentId: string;
  novoCargo: string;
}

export interface RenameBoardPositionCargoDeps {
  assignmentRepository: IBoardPositionAssignmentRepository;
  positionHistoryRepository: IMemberPositionHistoryRepository;
  clock: IClock;
}

/**
 * Corrige o NOME de um cargo já atribuído (ex.: erro de digitação num
 * cargo extra digitado à mão antes de existir uma chave fixa em
 * `BOARD_POSITION_KEYS` — "Mestre de Cerimônicas Adjunto" → "Mestre de
 * Cerimônias Adjunto") sem mexer em quem ocupa o cargo nem no histórico de
 * QUANDO ocupou — diferente de `AssignBoardPositionUseCase` (que troca o
 * titular) e `RemoveBoardPositionUseCase` (que esvazia o cargo). Aceita
 * tanto uma chave de `BOARD_POSITION_KEYS` quanto texto livre, mesma regra
 * de `AssignBoardPositionUseCase.cargo`.
 *
 * Também corrige o `cargo` da entrada ATIVA (`dataFim: null`) de
 * `MemberPositionHistory` do mesmo titular, quando ainda tiver o nome
 * antigo — é a mesma correção de digitação, não um novo cargo de verdade,
 * então não faz sentido o histórico continuar com o nome errado enquanto a
 * atribuição atual já foi corrigida.
 */
export class RenameBoardPositionCargoUseCase {
  constructor(private readonly deps: RenameBoardPositionCargoDeps) {}

  async execute(
    ctx: AuthContext,
    input: RenameBoardPositionCargoInput,
  ): Promise<Result<BoardPositionAssignment>> {
    requirePermission(ctx, 'boardTerm:manage');

    const novoCargo = input.novoCargo.trim();
    if (!novoCargo) {
      return err(new ConflictError('Informe o novo nome do cargo.'));
    }

    const assignment = await this.deps.assignmentRepository.findById(input.assignmentId);
    if (!assignment || assignment.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('BoardPositionAssignment', input.assignmentId));
    }

    if (assignment.cargo === novoCargo) {
      return ok(assignment);
    }

    const now = this.deps.clock.now();
    const updated: BoardPositionAssignment = {
      ...assignment,
      cargo: novoCargo,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.assignmentRepository.update(updated);

    const active = await this.deps.positionHistoryRepository.findActiveByMemberId(
      assignment.memberId,
    );
    if (active && active.gestaoId === assignment.gestaoId && active.cargo === assignment.cargo) {
      await this.deps.positionHistoryRepository.update({
        ...active,
        cargo: novoCargo,
        updatedAt: now,
        updatedBy: ctx.uid,
      });
    }

    return ok(updated);
  }
}
