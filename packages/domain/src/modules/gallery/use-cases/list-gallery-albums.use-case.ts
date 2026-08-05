import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { GalleryAlbum } from '../entities/gallery-album.entity';
import type { IGalleryAlbumRepository } from '../repositories/gallery-album.repository';

export interface ListGalleryAlbumsDeps {
  galleryAlbumRepository: IGalleryAlbumRepository;
}

export class ListGalleryAlbumsUseCase {
  constructor(private readonly deps: ListGalleryAlbumsDeps) {}

  async execute(ctx: AuthContext, categoria?: string): Promise<GalleryAlbum[]> {
    requirePermission(ctx, 'gallery:read');
    return this.deps.galleryAlbumRepository.listByTenant(ctx.tenantId, categoria);
  }
}
