import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { ILibraryFavoriteRepository } from '../repositories/library-favorite.repository';

export interface ToggleLibraryFavoriteDeps {
  favoriteRepository: ILibraryFavoriteRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface ToggleLibraryFavoriteResult {
  favorited: boolean;
}

/** Sem `requirePermission`: favoritar é uma ação pessoal, não gated por RBAC de recurso. */
export class ToggleLibraryFavoriteUseCase {
  constructor(private readonly deps: ToggleLibraryFavoriteDeps) {}

  async execute(
    ctx: AuthContext,
    libraryItemId: string,
  ): Promise<Result<ToggleLibraryFavoriteResult>> {
    const existing = await this.deps.favoriteRepository.findByUserAndItem(ctx.uid, libraryItemId);

    if (existing) {
      await this.deps.favoriteRepository.delete(existing.id);
      return ok({ favorited: false });
    }

    const now = this.deps.clock.now();
    await this.deps.favoriteRepository.create({
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      userId: ctx.uid,
      libraryItemId,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    });
    return ok({ favorited: true });
  }
}
