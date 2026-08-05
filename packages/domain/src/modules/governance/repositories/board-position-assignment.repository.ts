import type { BoardPositionKey } from '@vl6/shared';
import type { BoardPositionAssignment } from '../entities/board-position-assignment.entity';

export interface IBoardPositionAssignmentRepository {
  findById(id: string): Promise<BoardPositionAssignment | null>;
  listByGestao(gestaoId: string): Promise<BoardPositionAssignment[]>;
  /** Ocorrência única (todos os cargos exceto Diácono/Experto) — ver SINGLE_OCCURRENCE_BOARD_POSITIONS. */
  findByGestaoAndCargo(
    gestaoId: string,
    cargo: BoardPositionKey,
  ): Promise<BoardPositionAssignment | null>;
  create(assignment: BoardPositionAssignment): Promise<void>;
  update(assignment: BoardPositionAssignment): Promise<void>;
}
