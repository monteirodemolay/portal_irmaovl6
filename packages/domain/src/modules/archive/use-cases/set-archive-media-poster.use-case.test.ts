import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/result';
import { FixedClock, InMemoryArchiveMediaRepository } from '../../../test/fakes';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import { SetArchiveMediaPosterUseCase } from './set-archive-media-poster.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveMedia:update'],
};

function buildMedia(overrides: Partial<ArchiveMedia> = {}): ArchiveMedia {
  return {
    id: 'media-1',
    tenantId: 't1',
    eventId: 'event-1',
    boardTermId: 'term-1',
    archiveItemId: 'item-1',
    mediaAssetId: 'asset-1',
    mediaType: 'video',
    documentType: null,
    role: null,
    order: 0,
    caption: 'Uma legenda',
    altText: null,
    isCover: false,
    isFeatured: false,
    accessLevel: 'irmaos',
    allowDownload: false,
    publicacaoStatus: 'rascunho',
    autor: null,
    tags: [],
    posterMediaAssetId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'draft',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const archiveMediaRepository = new InMemoryArchiveMediaRepository();
  const useCase = new SetArchiveMediaPosterUseCase({
    archiveMediaRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
  });
  return { useCase, archiveMediaRepository };
}

describe('SetArchiveMediaPosterUseCase', () => {
  it('associa a miniatura a um vídeo', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia());

    const result = await useCase.execute(ctx, 'media-1', 'poster-asset-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.posterMediaAssetId).toBe('poster-asset-1');
  });

  it('remove a miniatura ao passar null', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia({ posterMediaAssetId: 'poster-asset-1' }));

    const result = await useCase.execute(ctx, 'media-1', null);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.posterMediaAssetId).toBeNull();
  });

  it('rejeita mídia que não é vídeo', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia({ mediaType: 'foto' }));

    const result = await useCase.execute(ctx, 'media-1', 'poster-asset-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('rejeita mídia inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'nao-existe', 'poster-asset-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('isolamento de tenant', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia({ tenantId: 't2' }));

    const result = await useCase.execute(ctx, 'media-1', 'poster-asset-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta a permissão archiveMedia:update', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia());

    await expect(
      useCase.execute({ ...ctx, permissions: [] }, 'media-1', 'poster-asset-1'),
    ).rejects.toThrow(ForbiddenError);
  });
});
