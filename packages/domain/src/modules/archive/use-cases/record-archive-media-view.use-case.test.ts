import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import { InMemoryArchiveItemRepository, InMemoryArchiveMediaRepository } from '../../../test/fakes';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import { RecordArchiveMediaViewUseCase } from './record-archive-media-view.use-case';

const ctx: AuthContext = {
  uid: 'membro-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveMedia:read'],
};

function buildItem(overrides: Partial<ArchiveItem> = {}): ArchiveItem {
  return {
    id: 'item-1',
    tenantId: 't1',
    eventId: 'event-1',
    boardTermId: 'term-1',
    titulo: 'Sessão Magna',
    tipo: 'fotografia',
    descricao: null,
    publicacaoStatus: 'publicado',
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
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const useCase = new RecordArchiveMediaViewUseCase({
    archiveMediaRepository,
    archiveItemRepository,
  });
  return { useCase, archiveMediaRepository, archiveItemRepository };
}

describe('RecordArchiveMediaViewUseCase', () => {
  it('rejeita quando a mídia não existe', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'media-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita quando a mídia pertence a outro tenant', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia({ tenantId: 't2' }));

    const result = await useCase.execute(ctx, 'media-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita quando a mídia já foi excluída', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia({ deletedAt: new Date('2026-02-01') }));

    const result = await useCase.execute(ctx, 'media-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('incrementa a contagem de visualizações da mídia e do item pai', async () => {
    const { useCase, archiveMediaRepository, archiveItemRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia());
    await archiveItemRepository.create(buildItem());

    const result = await useCase.execute(ctx, 'media-1');

    expect(result.ok).toBe(true);
    expect((await archiveMediaRepository.findById('media-1'))?.contagemVisualizacoes).toBe(1);
    expect((await archiveItemRepository.findById('item-1'))?.contagemVisualizacoes).toBe(1);
  });

  it('lança ForbiddenError quando falta a permissão archiveMedia:read', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia());

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'media-1')).rejects.toThrow(
      ForbiddenError,
    );
  });
});
