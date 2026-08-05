import type { BaseEntity } from '../../../shared/base-entity';

export interface LibraryFavorite extends BaseEntity {
  userId: string;
  libraryItemId: string;
}
