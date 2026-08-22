import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveItemRepository,
  InMemoryArchiveMediaRepository,
} from '../../../test/fakes';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import { SetArchiveItemCoverUseCase } from './set-archive-item-cover.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveItem:update'],
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
    publicacaoStatus: 'rascunho',
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
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const archiveMediaRepository = new InMemoryArchiveMediaRepository();
  const useCase = new SetArchiveItemCoverUseCase({
    archiveItemRepository,
    archiveMediaRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
  });
  return { useCase, archiveItemRepository, archiveMediaRepository };
}

describe('SetArchiveItemCoverUseCase', () => {
  it('marca a mídia como capa e atualiza capaMediaId do item', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(item);
    await archiveMediaRepository.create(buildMedia());

    const result = await useCase.execute(ctx, 'item-1', 'media-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.capaMediaId).toBe('media-1');

    const media = await archiveMediaRepository.findById('media-1');
    expect(media?.isCover).toBe(true);
  });

  it('garante unicidade: desmarca a capa anterior ao definir uma nova', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(item);
    await archiveMediaRepository.create(buildMedia({ id: 'media-1', isCover: true }));
    await archiveMediaRepository.create(buildMedia({ id: 'media-2', mediaAssetId: 'asset-2' }));

    const result = await useCase.execute(ctx, 'item-1', 'media-2');

    expect(result.ok).toBe(true);
    const previous = await archiveMediaRepository.findById('media-1');
    const current = await archiveMediaRepository.findById('media-2');
    expect(previous?.isCover).toBe(false);
    expect(current?.isCover).toBe(true);
  });

  it('rejeita quando a mídia não pertence ao item informado', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(item);
    await archiveItemRepository.create({ ...item, id: 'item-2' });
    await archiveMediaRepository.create(buildMedia({ archiveItemId: 'item-2' }));

    const result = await useCase.execute(ctx, 'item-1', 'media-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta a permissão archiveItem:update', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(item);
    await archiveMediaRepository.create(buildMedia());

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'item-1', 'media-1')).rejects.toThrow(
      ForbiddenError,
    );
  });
});
