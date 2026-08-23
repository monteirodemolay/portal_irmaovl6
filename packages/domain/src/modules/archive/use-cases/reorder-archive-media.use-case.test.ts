import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveItemRepository,
  InMemoryArchiveMediaRepository,
} from '../../../test/fakes';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import { ReorderArchiveMediaUseCase } from './reorder-archive-media.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveMedia:update'],
};

function buildItem(overrides: Partial<ArchiveItem> = {}): ArchiveItem {
  return {
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
    status: 'draft',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const archiveMediaRepository = new InMemoryArchiveMediaRepository();
  const useCase = new ReorderArchiveMediaUseCase({
    archiveItemRepository,
    archiveMediaRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
  });
  return { useCase, archiveItemRepository, archiveMediaRepository };
}

describe('ReorderArchiveMediaUseCase', () => {
  it('persiste a nova ordem sequencial (0, 1, 2…) conforme a lista informada', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem());
    await archiveMediaRepository.create(buildMedia({ id: 'media-1', order: 0 }));
    await archiveMediaRepository.create(buildMedia({ id: 'media-2', order: 1 }));
    await archiveMediaRepository.create(buildMedia({ id: 'media-3', order: 2 }));

    const result = await useCase.execute(ctx, 'item-1', ['media-3', 'media-1', 'media-2']);

    expect(result.ok).toBe(true);
    expect((await archiveMediaRepository.findById('media-3'))?.order).toBe(0);
    expect((await archiveMediaRepository.findById('media-1'))?.order).toBe(1);
    expect((await archiveMediaRepository.findById('media-2'))?.order).toBe(2);
  });

  it('rejeita item inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'nao-existe', []);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita lista que não corresponde exatamente às mídias atuais do item (mídia faltando)', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem());
    await archiveMediaRepository.create(buildMedia({ id: 'media-1', order: 0 }));
    await archiveMediaRepository.create(buildMedia({ id: 'media-2', order: 1 }));

    const result = await useCase.execute(ctx, 'item-1', ['media-1']);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('rejeita lista com mídia de outro item', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem());
    await archiveMediaRepository.create(buildMedia({ id: 'media-1', order: 0 }));
    await archiveMediaRepository.create(
      buildMedia({ id: 'media-outro-item', archiveItemId: 'item-2', order: 0 }),
    );

    const result = await useCase.execute(ctx, 'item-1', ['media-outro-item']);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('isolamento de tenant: não reordena item de outro tenant', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ tenantId: 't2' }));

    const result = await useCase.execute(ctx, 'item-1', []);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta a permissão archiveMedia:update', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem());

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'item-1', [])).rejects.toThrow(
      ForbiddenError,
    );
  });
});
