import type { BaseEntity } from '../../../shared/base-entity';

export interface BoardPositionAssignment extends BaseEntity {
  gestaoId: string;
  /** Chave de `BOARD_POSITION_KEYS` ou um cargo extra digitado pelo usuário. */
  cargo: string;
  memberId: string;
  ordem: number;
}
