import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryArchiveMediaRepository, InMemoryMediaAssetRepository } from '../../../test/fakes';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import type { MediaAsset } from '../entities/media-asset.entity';
import { ListDuplicateMediaAssetsUseCase } from './list-duplicate-media-assets.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveMedia:manage'],
};

function buildAsset(overrides: Partial<MediaAsset> = {}): MediaAsset {
  return {
    id: 'asset-1',
    tenantId: 't1',
    originalName: 'foto.jpg',
    normalizedName: 'foto.jpg',
    mimeType: 'image/jpeg',
    extension: 'jpg',
    size: 1000,
    sha256: 'a'.repeat(64),
    provider: 'vercel_blob',
    storageKey: 'archive/foto.jpg',
    processingStatus: 'pendente',
    width: null,
    height: null,
    duration: null,
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

function buildMedia(overrides: Partial<ArchiveMedia> = {}): ArchiveMedia {
  return {
    id: 'media-1',
    tenantId: 't1',
    eventId: 'event-1',
    boardTermId: 'term-1',
    archiveItemId: 'item-1',
    mediaAssetId: 'asset-1',
    mediaType: 'foto',
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
  const mediaAssetRepository = new InMemoryMediaAssetRepository();
  const archiveMediaRepository = new InMemoryArchiveMediaRepository();
  const useCase = new ListDuplicateMediaAssetsUseCase({
    mediaAssetRepository,
    archiveMediaRepository,
  });
  return { useCase, mediaAssetRepository, archiveMediaRepository };
}

describe('ListDuplicateMediaAssetsUseCase', () => {
  it('agrupa MediaAsset com o mesmo sha256, ignorando hashes únicos', async () => {
    const { useCase, mediaAssetRepository } = buildUseCase();
    await mediaAssetRepository.create(buildAsset({ id: 'asset-1', sha256: 'a'.repeat(64) }));
    await mediaAssetRepository.create(buildAsset({ id: 'asset-2', sha256: 'a'.repeat(64) }));
    await mediaAssetRepository.create(buildAsset({ id: 'asset-3', sha256: 'b'.repeat(64) }));

    const groups = await useCase.execute(ctx);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.sha256).toBe('a'.repeat(64));
    expect(groups[0]?.mediaAssets.map((a) => a.id).sort()).toEqual(['asset-1', 'asset-2']);
  });

  it('anexa as ArchiveMedia associadas a cada MediaAsset duplicado', async () => {
    const { useCase, mediaAssetRepository, archiveMediaRepository } = buildUseCase();
    await mediaAssetRepository.create(buildAsset({ id: 'asset-1', sha256: 'a'.repeat(64) }));
    await mediaAssetRepository.create(buildAsset({ id: 'asset-2', sha256: 'a'.repeat(64) }));
    await archiveMediaRepository.create(buildMedia({ id: 'media-1', mediaAssetId: 'asset-1' }));
    await archiveMediaRepository.create(buildMedia({ id: 'media-2', mediaAssetId: 'asset-2' }));

    const groups = await useCase.execute(ctx);

    expect(groups[0]?.archiveMediaByAssetId['asset-1']?.map((m) => m.id)).toEqual(['media-1']);
    expect(groups[0]?.archiveMediaByAssetId['asset-2']?.map((m) => m.id)).toEqual(['media-2']);
  });

  it('não considera duplicata o mesmo sha256 em outro tenant', async () => {
    const { useCase, mediaAssetRepository } = buildUseCase();
    await mediaAssetRepository.create(
      buildAsset({ id: 'asset-1', tenantId: 't1', sha256: 'a'.repeat(64) }),
    );
    await mediaAssetRepository.create(
      buildAsset({ id: 'asset-2', tenantId: 't2', sha256: 'a'.repeat(64) }),
    );

    const groups = await useCase.execute(ctx);

    expect(groups).toHaveLength(0);
  });

  it('retorna lista vazia quando não há duplicatas', async () => {
    const { useCase, mediaAssetRepository } = buildUseCase();
    await mediaAssetRepository.create(buildAsset({ id: 'asset-1', sha256: 'a'.repeat(64) }));

    const groups = await useCase.execute(ctx);

    expect(groups).toEqual([]);
  });

  it('lança ForbiddenError quando falta a permissão archiveMedia:manage', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ ...ctx, permissions: [] })).rejects.toThrow(ForbiddenError);
  });
});
