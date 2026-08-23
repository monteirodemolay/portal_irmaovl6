import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  InMemoryArchiveMediaRepository,
  InMemoryBoardTermRepository,
  InMemoryMediaAssetRepository,
} from '../../../test/fakes';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import type { MediaAsset } from '../entities/media-asset.entity';
import type { BoardTerm } from '../../governance/entities/board-term.entity';
import { GetStorageUsageByBoardTermUseCase } from './get-storage-usage-by-board-term.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveMedia:manage'],
};

function buildTerm(overrides: Partial<BoardTerm> = {}): BoardTerm {
  return {
    id: 'term-1',
    tenantId: 't1',
    nome: 'Gestão 2025/2026',
    periodoInicio: new Date('2025-01-01'),
    periodoFim: new Date('2025-12-31'),
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date('2024-12-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

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
    processingStatus: 'concluido',
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
    caption: null,
    altText: null,
    isCover: false,
    isFeatured: false,
    accessLevel: 'irmaos',
    allowDownload: false,
    publicacaoStatus: 'publicado',
    autor: null,
    tags: [],
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

function buildUseCase() {
  const archiveMediaRepository = new InMemoryArchiveMediaRepository();
  const mediaAssetRepository = new InMemoryMediaAssetRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const useCase = new GetStorageUsageByBoardTermUseCase({
    archiveMediaRepository,
    mediaAssetRepository,
    boardTermRepository,
  });
  return { useCase, archiveMediaRepository, mediaAssetRepository, boardTermRepository };
}

describe('GetStorageUsageByBoardTermUseCase', () => {
  it('soma o tamanho dos MediaAsset agrupado por boardTermId', async () => {
    const { useCase, archiveMediaRepository, mediaAssetRepository, boardTermRepository } =
      buildUseCase();
    await boardTermRepository.create(buildTerm());
    await mediaAssetRepository.create(buildAsset({ id: 'asset-1', size: 1000 }));
    await mediaAssetRepository.create(buildAsset({ id: 'asset-2', size: 2500 }));
    await archiveMediaRepository.create(
      buildMedia({ id: 'media-1', mediaAssetId: 'asset-1', boardTermId: 'term-1' }),
    );
    await archiveMediaRepository.create(
      buildMedia({ id: 'media-2', mediaAssetId: 'asset-2', boardTermId: 'term-1' }),
    );

    const result = await useCase.execute(ctx);

    expect(result).toEqual([
      {
        boardTermId: 'term-1',
        boardTermNome: 'Gestão 2025/2026',
        totalBytes: 3500,
        quantidadeArquivos: 2,
      },
    ]);
  });

  it('inclui Gestões sem nenhum arquivo com zero bytes', async () => {
    const { useCase, boardTermRepository } = buildUseCase();
    await boardTermRepository.create(buildTerm({ id: 'term-vazia', nome: 'Gestão sem arquivos' }));

    const result = await useCase.execute(ctx);

    expect(result).toEqual([
      {
        boardTermId: 'term-vazia',
        boardTermNome: 'Gestão sem arquivos',
        totalBytes: 0,
        quantidadeArquivos: 0,
      },
    ]);
  });

  it('ignora mídia sem boardTermId (evento fora de qualquer Gestão cadastrada)', async () => {
    const { useCase, archiveMediaRepository, mediaAssetRepository, boardTermRepository } =
      buildUseCase();
    await boardTermRepository.create(buildTerm());
    await mediaAssetRepository.create(buildAsset({ id: 'asset-1', size: 1000 }));
    await archiveMediaRepository.create(
      buildMedia({ id: 'media-1', mediaAssetId: 'asset-1', boardTermId: null }),
    );

    const result = await useCase.execute(ctx);

    expect(result).toEqual([
      {
        boardTermId: 'term-1',
        boardTermNome: 'Gestão 2025/2026',
        totalBytes: 0,
        quantidadeArquivos: 0,
      },
    ]);
  });

  it('ordena da Gestão que mais usa espaço para a que menos usa', async () => {
    const { useCase, archiveMediaRepository, mediaAssetRepository, boardTermRepository } =
      buildUseCase();
    await boardTermRepository.create(buildTerm({ id: 'term-pequena', nome: 'Pequena' }));
    await boardTermRepository.create(buildTerm({ id: 'term-grande', nome: 'Grande' }));
    await mediaAssetRepository.create(buildAsset({ id: 'asset-pequeno', size: 100 }));
    await mediaAssetRepository.create(buildAsset({ id: 'asset-grande', size: 9000 }));
    await archiveMediaRepository.create(
      buildMedia({ id: 'media-1', mediaAssetId: 'asset-pequeno', boardTermId: 'term-pequena' }),
    );
    await archiveMediaRepository.create(
      buildMedia({ id: 'media-2', mediaAssetId: 'asset-grande', boardTermId: 'term-grande' }),
    );

    const result = await useCase.execute(ctx);

    expect(result.map((r) => r.boardTermId)).toEqual(['term-grande', 'term-pequena']);
  });

  it('lança ForbiddenError quando falta a permissão archiveMedia:manage', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ ...ctx, permissions: [] })).rejects.toThrow(ForbiddenError);
  });
});
