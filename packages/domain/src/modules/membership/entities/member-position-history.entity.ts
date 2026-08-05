import type { BoardPositionKey } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

export interface MemberPositionHistory extends BaseEntity {
  memberId: string;
  cargo: BoardPositionKey;
  gestaoId: string;
  dataInicio: Date;
  dataFim: Date | null;
  observacoes: string | null;
}
