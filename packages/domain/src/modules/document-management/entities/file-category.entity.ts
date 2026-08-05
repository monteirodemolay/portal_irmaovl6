import type { BaseEntity } from '../../../shared/base-entity';

export interface FileCategory extends BaseEntity {
  nome: string;
  acervo: string | null;
  ordem: number;
}
