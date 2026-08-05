import type { BoardPositionKey } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

export interface BoardPositionAssignment extends BaseEntity {
  gestaoId: string;
  cargo: BoardPositionKey;
  memberId: string;
  ordem: number;
}
