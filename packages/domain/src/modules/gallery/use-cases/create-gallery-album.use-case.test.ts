import { describe, expect, it } from 'vitest';
import type { GalleryAlbumFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryGalleryAlbumRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateGalleryAlbumUseCase } from './create-gallery-album.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['gallery:create'],
};

const input: GalleryAlbumFormValues = {
  titulo: 'Confraternização 2026',
  categoria: 'Confraternização',
  capaUrl: null,
  dataEvento: new Date('2026-06-01'),
};

function buildUseCase() {
  const galleryAlbumRepository = new InMemoryGalleryAlbumRepository();
  const useCase = new CreateGalleryAlbumUseCase({
    galleryAlbumRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, galleryAlbumRepository };
}

describe('CreateGalleryAlbumUseCase', () => {
  it('cria o álbum ativo com os dados do tenant do contexto', async () => {
    const { useCase, galleryAlbumRepository } = buildUseCase();

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.titulo).toBe('Confraternização 2026');
    expect(result.value.tenantId).toBe('t1');
    expect(result.value.status).toBe('active');
    expect(result.value.ativo).toBe(true);

    const stored = await galleryAlbumRepository.findById(result.value.id);
    expect(stored).not.toBeNull();
  });

  it('lança ForbiddenError quando falta a permissão gallery:create', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ ...ctx, permissions: [] }, input)).rejects.toThrow(
      ForbiddenError,
    );
  });
});
