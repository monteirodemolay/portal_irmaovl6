import type { AuthContext } from '../../../shared/auth-context';
import type { LibraryFavorite } from '../entities/library-favorite.entity';
import type { ILibraryFavoriteRepository } from '../repositories/library-favorite.repository';

export interface ListMyFavoritesDeps {
  favoriteRepository: ILibraryFavoriteRepository;
}

export class ListMyFavoritesUseCase {
  constructor(private readonly deps: ListMyFavoritesDeps) {}

  async execute(ctx: AuthContext): Promise<LibraryFavorite[]> {
    return this.deps.favoriteRepository.listByUser(ctx.tenantId, ctx.uid);
  }
}
