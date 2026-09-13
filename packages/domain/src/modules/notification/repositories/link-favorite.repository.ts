import type { LinkFavorite } from '../entities/link-favorite.entity';

export interface ILinkFavoriteRepository {
  findByUserAndLink(userId: string, linkId: string): Promise<LinkFavorite | null>;
  listByUser(tenantId: string, userId: string): Promise<LinkFavorite[]>;
  create(favorite: LinkFavorite): Promise<void>;
  /** Exclusão física, deliberada — mesma justificativa de `ILibraryFavoriteRepository.delete`. */
  delete(id: string): Promise<void>;
}
