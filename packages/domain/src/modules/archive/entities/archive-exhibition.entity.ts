import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Uma seção narrativa da exposição — título+texto curatorial próprios,
 * referenciando itens do Acervo pelo ID composto (nunca copia o registro).
 */
export interface ExhibitionSection {
  id: string;
  titulo: string;
  texto: string | null;
  itemIds: string[];
}

/**
 * Exposição Virtual (docs/architecture/11-acervo-vl6.md §11.6d) — diferente
 * de `ArchiveCollection` (agrupamento plano de itens), a exposição tem
 * estrutura narrativa: uma sequência de seções, cada uma com seu próprio
 * texto curatorial e itens.
 */
export interface ArchiveExhibition extends BaseEntity {
  titulo: string;
  slug: string;
  descricaoEditorial: string | null;
  curadoPor: string | null;
  capaUrl: string | null;
  publicado: boolean;
  ordem: number;
  secoes: ExhibitionSection[];
}
