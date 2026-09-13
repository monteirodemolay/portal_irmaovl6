import type { AuthContext } from '../../../shared/auth-context';
import type { LinkFavorite } from '../entities/link-favorite.entity';
import type { ILinkFavoriteRepository } from '../repositories/link-favorite.repository';

export interface ListMyLinkFavoritesDeps {
  favoriteRepository: ILinkFavoriteRepository;
}

export class ListMyLinkFavoritesUseCase {
  constructor(private readonly deps: ListMyLinkFavoritesDeps) {}

  async execute(ctx: AuthContext): Promise<LinkFavorite[]> {
    return this.deps.favoriteRepository.listByUser(ctx.tenantId, ctx.uid);
  }
}
