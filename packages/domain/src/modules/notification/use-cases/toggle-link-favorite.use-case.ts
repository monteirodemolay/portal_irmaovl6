import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { ILinkFavoriteRepository } from '../repositories/link-favorite.repository';

export interface ToggleLinkFavoriteDeps {
  favoriteRepository: ILinkFavoriteRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface ToggleLinkFavoriteResult {
  favorited: boolean;
}

/** Sem `requirePermission`: favoritar é uma ação pessoal, mesmo espírito de `ToggleLibraryFavoriteUseCase`. */
export class ToggleLinkFavoriteUseCase {
  constructor(private readonly deps: ToggleLinkFavoriteDeps) {}

  async execute(ctx: AuthContext, linkId: string): Promise<Result<ToggleLinkFavoriteResult>> {
    const existing = await this.deps.favoriteRepository.findByUserAndLink(ctx.uid, linkId);

    if (existing) {
      await this.deps.favoriteRepository.delete(existing.id);
      return ok({ favorited: false });
    }

    const now = this.deps.clock.now();
    await this.deps.favoriteRepository.create({
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      userId: ctx.uid,
      linkId,
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
