import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryGalleryAlbumRepository } from '../../../test/fakes';
import type { GalleryAlbum } from '../entities/gallery-album.entity';
import { ListGalleryAlbumsUseCase } from './list-gallery-albums.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: ['gallery:read'] };

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

describe('ListGalleryAlbumsUseCase', () => {
  it('lista todos os álbuns do tenant quando nenhuma categoria é informada', async () => {
    const repository = new InMemoryGalleryAlbumRepository();
    await repository.create(buildAlbum({ id: 'album-1', categoria: 'Confraternização' }));
    await repository.create(buildAlbum({ id: 'album-2', categoria: 'Iniciação' }));
    await repository.create(buildAlbum({ id: 'album-3', tenantId: 'outro-tenant' }));
    const useCase = new ListGalleryAlbumsUseCase({ galleryAlbumRepository: repository });

    const albums = await useCase.execute(ctx);

    expect(albums.map((a) => a.id).sort()).toEqual(['album-1', 'album-2']);
  });

  it('filtra por categoria quando informada', async () => {
    const repository = new InMemoryGalleryAlbumRepository();
    await repository.create(buildAlbum({ id: 'album-1', categoria: 'Confraternização' }));
    await repository.create(buildAlbum({ id: 'album-2', categoria: 'Iniciação' }));
    const useCase = new ListGalleryAlbumsUseCase({ galleryAlbumRepository: repository });

    const albums = await useCase.execute(ctx, 'Iniciação');

    expect(albums.map((a) => a.id)).toEqual(['album-2']);
  });

  it('lança ForbiddenError quando falta a permissão gallery:read', async () => {
    const repository = new InMemoryGalleryAlbumRepository();
    const useCase = new ListGalleryAlbumsUseCase({ galleryAlbumRepository: repository });

    await expect(useCase.execute({ ...ctx, permissions: [] })).rejects.toThrow(ForbiddenError);
  });
});
