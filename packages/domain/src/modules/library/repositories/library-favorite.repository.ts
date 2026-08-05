import type { LibraryFavorite } from '../entities/library-favorite.entity';

export interface ILibraryFavoriteRepository {
  findByUserAndItem(userId: string, libraryItemId: string): Promise<LibraryFavorite | null>;
  listByUser(tenantId: string, userId: string): Promise<LibraryFavorite[]>;
  create(favorite: LibraryFavorite): Promise<void>;
  /**
   * Exclusão física, deliberada — única exceção à regra de soft delete do
   * sistema. Um favorito é uma preferência pessoal sem valor de auditoria
   * quando desfeito; mantê-lo como registro morto para sempre só inflaria a
   * coleção sem benefício algum.
   */
  delete(id: string): Promise<void>;
}
