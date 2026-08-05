import type { BaseEntity } from '../../../shared/base-entity';

/** Categoria ou subcategoria — `categoriaPaiId` diferencia (docs/architecture/03). */
export interface LibraryCategory extends BaseEntity {
  nome: string;
  categoriaPaiId: string | null;
  ordem: number;
}
