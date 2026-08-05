import type { BaseEntity } from '../../../shared/base-entity';

/** Gestão anual — docs/architecture/03-modelo-dados.md. */
export interface BoardTerm extends BaseEntity {
  nome: string;
  periodoInicio: Date;
  periodoFim: Date;
}
