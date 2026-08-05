import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { GalleryMedia } from '../entities/gallery-media.entity';
import type { IGalleryMediaRepository } from '../repositories/gallery-media.repository';

export interface ListGalleryMediaDeps {
  galleryMediaRepository: IGalleryMediaRepository;
}

export class ListGalleryMediaByAlbumUseCase {
  constructor(private readonly deps: ListGalleryMediaDeps) {}

  async execute(ctx: AuthContext, albumId: string): Promise<GalleryMedia[]> {
    requirePermission(ctx, 'gallery:read');
    return this.deps.galleryMediaRepository.listByAlbum(albumId);
  }
}
