import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { GalleryAlbum } from '../entities/gallery-album.entity';
import type { IGalleryAlbumRepository } from '../repositories/gallery-album.repository';

export interface DeleteGalleryAlbumDeps {
  galleryAlbumRepository: IGalleryAlbumRepository;
  clock: IClock;
}

/** Exclusão lógica — seta `deletedAt`, nunca remove o documento (docs/architecture/03 §3.1). */
export class DeleteGalleryAlbumUseCase {
  constructor(private readonly deps: DeleteGalleryAlbumDeps) {}

  async execute(ctx: AuthContext, albumId: string): Promise<Result<GalleryAlbum>> {
    requirePermission(ctx, 'gallery:delete');

    const current = await this.deps.galleryAlbumRepository.findById(albumId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('GalleryAlbum', albumId));
    }

    const now = this.deps.clock.now();
    const updated: GalleryAlbum = {
      ...current,
      deletedAt: now,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.galleryAlbumRepository.update(updated);

    return ok(updated);
  }
}
