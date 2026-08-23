import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveItemRepository,
  InMemoryArchiveMediaRepository,
  InMemoryMediaAssetRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { MediaAsset } from '../entities/media-asset.entity';
import { AttachMediaToArchiveItemUseCase } from './attach-media-to-archive-item.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveMedia:create'],
};

const item: ArchiveItem = {
  id: 'item-1',
  tenantId: 't1',
  eventId: 'event-1',
  boardTermId: 'term-1',
  titulo: 'Fotos da Sessão',
  tipo: 'fotografia',
  descricao: null,
  publicacaoStatus: 'rascunho',
  nivelAcesso: 'irmaos',
  capaMediaId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'draft',
  ativo: true,
};

const mediaAsset: MediaAsset = {
  id: 'media-1',
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
};

const input = {
  archiveItemId: 'item-1',
  mediaAssetId: 'media-1',
  mediaType: 'foto' as const,
  documentType: null,
  role: null,
  order: 0,
  caption: null,
  altText: null,
  accessLevel: 'administracao' as const,
  allowDownload: false,
};

function buildUseCase() {
  const archiveMediaRepository = new InMemoryArchiveMediaRepository();
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const mediaAssetRepository = new InMemoryMediaAssetRepository();
  const useCase = new AttachMediaToArchiveItemUseCase({
    archiveMediaRepository,
    archiveItemRepository,
    mediaAssetRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, archiveMediaRepository, archiveItemRepository, mediaAssetRepository };
}

describe('AttachMediaToArchiveItemUseCase', () => {
  it('herda eventId/boardTermId do item pai — nunca do input', async () => {
    const { useCase, archiveItemRepository, mediaAssetRepository } = buildUseCase();
    await archiveItemRepository.create(item);
    await mediaAssetRepository.create(mediaAsset);

    // O input do caso de uso nem sequer aceita eventId/boardTermId (checado em tempo de compilação);
    // aqui confirmamos que o valor persistido vem sempre do item pai.
    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.eventId).toBe(item.eventId);
    expect(result.value.boardTermId).toBe(item.boardTermId);
  });

  it('rejeita quando o ArchiveItem não existe', async () => {
    const { useCase, mediaAssetRepository } = buildUseCase();
    await mediaAssetRepository.create(mediaAsset);

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita quando o MediaAsset não existe', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(item);

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('isolamento de tenant: rejeita ArchiveItem de outro tenant', async () => {
    const { useCase, archiveItemRepository, mediaAssetRepository } = buildUseCase();
    await archiveItemRepository.create({ ...item, tenantId: 't2' });
    await mediaAssetRepository.create(mediaAsset);

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta a permissão archiveMedia:create', async () => {
    const { useCase, archiveItemRepository, mediaAssetRepository } = buildUseCase();
    await archiveItemRepository.create(item);
    await mediaAssetRepository.create(mediaAsset);

    await expect(useCase.execute({ ...ctx, permissions: [] }, input)).rejects.toThrow(
      ForbiddenError,
    );
  });
});
