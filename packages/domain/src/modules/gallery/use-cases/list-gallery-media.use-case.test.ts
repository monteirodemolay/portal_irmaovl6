import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryGalleryMediaRepository } from '../../../test/fakes';
import type { GalleryMedia } from '../entities/gallery-media.entity';
import { ListGalleryMediaByAlbumUseCase } from './list-gallery-media.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: ['gallery:read'] };

function buildMedia(overrides: Partial<GalleryMedia> = {}): GalleryMedia {
  return {
    id: 'media-1',
    tenantId: 't1',
    albumId: 'album-1',
    tipo: 'foto',
    url: 'https://example.com/foto.jpg',
    urlMiniatura: null,
    ordem: 0,
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

describe('ListGalleryMediaByAlbumUseCase', () => {
  it('lista apenas a mídia do álbum informado', async () => {
    const repository = new InMemoryGalleryMediaRepository();
    await repository.create(buildMedia({ id: 'media-1', albumId: 'album-1' }));
    await repository.create(buildMedia({ id: 'media-2', albumId: 'album-1' }));
    await repository.create(buildMedia({ id: 'media-3', albumId: 'album-2' }));
    const useCase = new ListGalleryMediaByAlbumUseCase({ galleryMediaRepository: repository });

    const media = await useCase.execute(ctx, 'album-1');

    expect(media.map((m) => m.id).sort()).toEqual(['media-1', 'media-2']);
  });

  it('retorna lista vazia quando o álbum não possui mídia', async () => {
    const repository = new InMemoryGalleryMediaRepository();
    const useCase = new ListGalleryMediaByAlbumUseCase({ galleryMediaRepository: repository });

    const media = await useCase.execute(ctx, 'album-sem-midia');

    expect(media).toEqual([]);
  });

  it('lança ForbiddenError quando falta a permissão gallery:read', async () => {
    const repository = new InMemoryGalleryMediaRepository();
    const useCase = new ListGalleryMediaByAlbumUseCase({ galleryMediaRepository: repository });

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'album-1')).rejects.toThrow(
      ForbiddenError,
    );
  });
});
