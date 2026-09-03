import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryArchiveItemRepository, InMemoryArchiveMediaRepository } from '../../../test/fakes';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import { GetArchiveMediaCountsByEventUseCase } from './get-archive-media-counts-by-event.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveItem:create'],
};

function buildItem(overrides: Partial<ArchiveItem> = {}): ArchiveItem {
  return {
    id: 'item-1',
    tenantId: 't1',
    eventId: 'event-1',
    boardTermId: 'term-1',
    titulo: 'Item',
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
    publicacaoStatus: 'rascunho',
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
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const archiveMediaRepository = new InMemoryArchiveMediaRepository();
  const useCase = new GetArchiveMediaCountsByEventUseCase({
    archiveItemRepository,
    archiveMediaRepository,
  });
  return { useCase, archiveItemRepository, archiveMediaRepository };
}

describe('GetArchiveMediaCountsByEventUseCase', () => {
  it('agrupa contagens por eventId via archiveItemId', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ id: 'item-1', eventId: 'event-1' }));
    await archiveItemRepository.create(buildItem({ id: 'item-2', eventId: 'event-2' }));
    await archiveMediaRepository.create(
      buildMedia({ id: 'media-1', archiveItemId: 'item-1', mediaType: 'foto' }),
    );
    await archiveMediaRepository.create(
      buildMedia({ id: 'media-2', archiveItemId: 'item-1', mediaType: 'foto' }),
    );
    await archiveMediaRepository.create(
      buildMedia({ id: 'media-3', archiveItemId: 'item-1', mediaType: 'video' }),
    );
    await archiveMediaRepository.create(
      buildMedia({ id: 'media-4', archiveItemId: 'item-2', mediaType: 'documento' }),
    );

    const result = await useCase.execute(ctx);

    expect(result['event-1']).toEqual({
      archiveItemId: 'item-1',
      counts: { foto: 2, video: 1, audio: 0, documento: 0 },
    });
    expect(result['event-2']).toEqual({
      archiveItemId: 'item-2',
      counts: { foto: 0, video: 0, audio: 0, documento: 1 },
    });
  });

  it('escolhe o ArchiveItem com mais mídia quando um Evento tem mais de um item', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(
      buildItem({ id: 'item-1', eventId: 'event-1', createdAt: new Date('2026-01-01') }),
    );
    await archiveItemRepository.create(
      buildItem({ id: 'item-2', eventId: 'event-1', createdAt: new Date('2026-02-01') }),
    );
    await archiveMediaRepository.create(
      buildMedia({ id: 'media-1', archiveItemId: 'item-1', mediaType: 'foto' }),
    );
    await archiveMediaRepository.create(
      buildMedia({ id: 'media-2', archiveItemId: 'item-2', mediaType: 'foto' }),
    );
    await archiveMediaRepository.create(
      buildMedia({ id: 'media-3', archiveItemId: 'item-2', mediaType: 'video' }),
    );

    const result = await useCase.execute(ctx);

    expect(result['event-1']?.archiveItemId).toBe('item-2');
  });

  it('ignora mídia sem ArchiveItem correspondente', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(
      buildMedia({ id: 'media-orfa', archiveItemId: 'inexistente' }),
    );

    const result = await useCase.execute(ctx);

    expect(result).toEqual({});
  });

  it('exige permissão archiveItem:create', async () => {
    const { useCase } = buildUseCase();
    const noPerm: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(noPerm)).rejects.toThrow(ForbiddenError);
  });
});
