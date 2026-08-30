import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryGalleryAlbumRepository } from '../../../test/fakes';
import type { GalleryAlbum } from '../entities/gallery-album.entity';
import { DeleteGalleryAlbumUseCase } from './delete-gallery-album.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['gallery:manage'],
};

function buildAlbum(overrides: Partial<GalleryAlbum> = {}): GalleryAlbum {
  return {
    id: 'album-1',
    tenantId: 't1',
    titulo: 'Sessão Magna',
    categoria: 'Sessão',
    capaUrl: null,
    dataEvento: new Date('2026-01-01'),
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('DeleteGalleryAlbumUseCase', () => {
  it('marca deletedAt sem apagar o documento', async () => {
    const galleryAlbumRepository = new InMemoryGalleryAlbumRepository();
    await galleryAlbumRepository.create(buildAlbum());
    const useCase = new DeleteGalleryAlbumUseCase({
      galleryAlbumRepository,
      clock: new FixedClock(new Date('2026-03-01')),
    });

    const result = await useCase.execute(ctx, 'album-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.deletedAt).toEqual(new Date('2026-03-01'));
    expect(await galleryAlbumRepository.findById('album-1')).not.toBeNull();
  });

  it('retorna NotFoundError quando o álbum não existe no tenant', async () => {
    const galleryAlbumRepository = new InMemoryGalleryAlbumRepository();
    const useCase = new DeleteGalleryAlbumUseCase({
      galleryAlbumRepository,
      clock: new FixedClock(),
    });

    const result = await useCase.execute(ctx, 'album-inexistente');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('devolve NotFoundError pra álbum de outro tenant (isolamento multi-tenant)', async () => {
    const galleryAlbumRepository = new InMemoryGalleryAlbumRepository();
    await galleryAlbumRepository.create(buildAlbum({ tenantId: 't2' }));
    const useCase = new DeleteGalleryAlbumUseCase({
      galleryAlbumRepository,
      clock: new FixedClock(),
    });

    const result = await useCase.execute(ctx, 'album-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
