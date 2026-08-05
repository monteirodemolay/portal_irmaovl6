import type { BaseEntity } from '../../../shared/base-entity';

export interface Committee extends BaseEntity {
  gestaoId: string;
  nome: string;
  descricao: string | null;
  membrosIds: string[];
}
