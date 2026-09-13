import type { BaseEntity } from '../../../shared/base-entity';

/** Mesmo padrão de `LibraryFavorite` — preferência pessoal, não institucional. */
export interface LinkFavorite extends BaseEntity {
  userId: string;
  linkId: string;
}
