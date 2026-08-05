import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { GalleryAlbum } from '../entities/gallery-album.entity';
import type { GalleryMedia } from '../entities/gallery-media.entity';
import type { IGalleryAlbumRepository } from '../repositories/gallery-album.repository';
import type { IGalleryMediaRepository } from '../repositories/gallery-media.repository';
import { AddGalleryMediaUseCase } from './add-gallery-media.use-case';

const ctx: AuthContext = {
  uid: 'u1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['gallery:create'],
};

const clock: IClock = { now: () => new Date('2026-01-01T00:00:00Z') };
const idGenerator: IIdGenerator = { next: () => 'media-1' };

function buildAlbum(overrides: Partial<GalleryAlbum> = {}): GalleryAlbum {
  return {
    id: 'album-1',
    tenantId: 't1',
    titulo: 'Confraternização 2026',
    categoria: 'Confraternização',
    capaUrl: null,
    dataEvento: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin',
    updatedBy: 'admin',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

class FakeAlbumRepository implements Partial<IGalleryAlbumRepository> {
  constructor(private readonly album: GalleryAlbum | null) {}
  async findById() {
    return this.album;
  }
}

class FakeMediaRepository implements Partial<IGalleryMediaRepository> {
  created: GalleryMedia | null = null;
  async create(media: GalleryMedia) {
    this.created = media;
  }
}

describe('AddGalleryMediaUseCase', () => {
  it('rejeita quando o álbum não existe ou é de outro tenant', async () => {
    const mediaRepo = new FakeMediaRepository();
    const useCase = new AddGalleryMediaUseCase({
      galleryMediaRepository: mediaRepo as unknown as IGalleryMediaRepository,
      galleryAlbumRepository: new FakeAlbumRepository(
        buildAlbum({ tenantId: 'outro-tenant' }),
      ) as unknown as IGalleryAlbumRepository,
      clock,
      idGenerator,
    });

    const result = await useCase.execute(ctx, {
      albumId: 'album-1',
      tipo: 'foto',
      url: 'https://example.com/foto.jpg',
      urlMiniatura: null,
      ordem: 0,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
    expect(mediaRepo.created).toBeNull();
  });

  it('adiciona a mídia quando o álbum existe no mesmo tenant', async () => {
    const mediaRepo = new FakeMediaRepository();
    const useCase = new AddGalleryMediaUseCase({
      galleryMediaRepository: mediaRepo as unknown as IGalleryMediaRepository,
      galleryAlbumRepository: new FakeAlbumRepository(
        buildAlbum(),
      ) as unknown as IGalleryAlbumRepository,
      clock,
      idGenerator,
    });

    const result = await useCase.execute(ctx, {
      albumId: 'album-1',
      tipo: 'foto',
      url: 'https://example.com/foto.jpg',
      urlMiniatura: null,
      ordem: 0,
    });

    expect(result.ok).toBe(true);
    expect(mediaRepo.created?.id).toBe('media-1');
  });
});
