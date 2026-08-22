import type { BaseEntity } from '../../../shared/base-entity';

export interface MemberPositionHistory extends BaseEntity {
  memberId: string;
  /** Chave de `BOARD_POSITION_KEYS` ou um cargo extra digitado pelo usuário. */
  cargo: string;
  gestaoId: string;
  dataInicio: Date;
  dataFim: Date | null;
  observacoes: string | null;
}
