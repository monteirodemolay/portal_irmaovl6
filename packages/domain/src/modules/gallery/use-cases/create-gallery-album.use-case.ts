import type { GalleryAlbumFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { GalleryAlbum } from '../entities/gallery-album.entity';
import type { IGalleryAlbumRepository } from '../repositories/gallery-album.repository';

export interface CreateGalleryAlbumDeps {
  galleryAlbumRepository: IGalleryAlbumRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export class CreateGalleryAlbumUseCase {
  constructor(private readonly deps: CreateGalleryAlbumDeps) {}

  async execute(ctx: AuthContext, input: GalleryAlbumFormValues): Promise<Result<GalleryAlbum>> {
    requirePermission(ctx, 'gallery:create');

    const now = this.deps.clock.now();
    const album: GalleryAlbum = {
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
    await this.deps.galleryAlbumRepository.create(album);

    return ok(album);
  }
}
