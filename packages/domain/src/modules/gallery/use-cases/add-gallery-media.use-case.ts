import type { GalleryMediaFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { GalleryMedia } from '../entities/gallery-media.entity';
import type { IGalleryAlbumRepository } from '../repositories/gallery-album.repository';
import type { IGalleryMediaRepository } from '../repositories/gallery-media.repository';

export interface AddGalleryMediaDeps {
  galleryMediaRepository: IGalleryMediaRepository;
  galleryAlbumRepository: IGalleryAlbumRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export class AddGalleryMediaUseCase {
  constructor(private readonly deps: AddGalleryMediaDeps) {}

  async execute(ctx: AuthContext, input: GalleryMediaFormValues): Promise<Result<GalleryMedia>> {
    requirePermission(ctx, 'gallery:create');

    const album = await this.deps.galleryAlbumRepository.findById(input.albumId);
    if (!album || album.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('GalleryAlbum', input.albumId));
    }

    const now = this.deps.clock.now();
    const media: GalleryMedia = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ...input,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.galleryMediaRepository.create(media);

    return ok(media);
  }
}
