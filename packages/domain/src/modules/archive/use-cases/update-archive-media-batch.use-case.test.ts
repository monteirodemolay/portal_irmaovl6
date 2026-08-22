import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/result';
import { FixedClock, InMemoryArchiveMediaRepository } from '../../../test/fakes';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import { UpdateArchiveMediaBatchUseCase } from './update-archive-media-batch.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveMedia:manage'],
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
  const archiveMediaRepository = new InMemoryArchiveMediaRepository();
  const useCase = new UpdateArchiveMediaBatchUseCase({
    archiveMediaRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
  });
  return { useCase, archiveMediaRepository };
}

describe('UpdateArchiveMediaBatchUseCase', () => {
  it('aplica os campos informados a todas as mídias da lista', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia({ id: 'media-1' }));
    await archiveMediaRepository.create(buildMedia({ id: 'media-2', mediaAssetId: 'asset-2' }));

    const result = await useCase.execute(ctx, {
      archiveItemId: 'item-1',
      archiveMediaIds: ['media-1', 'media-2'],
      fields: { autor: 'Irmão Fulano', tags: ['sessao', 'solene'], allowDownload: true },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);

    const media1 = await archiveMediaRepository.findById('media-1');
    expect(media1?.autor).toBe('Irmão Fulano');
    expect(media1?.tags).toEqual(['sessao', 'solene']);
    expect(media1?.allowDownload).toBe(true);
    // accessLevel não foi informado — preserva o valor original.
    expect(media1?.accessLevel).toBe('irmaos');
  });

  it('sobrescreve o nível de acesso quando informado', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia({ id: 'media-1', accessLevel: 'irmaos' }));

    const result = await useCase.execute(ctx, {
      archiveItemId: 'item-1',
      archiveMediaIds: ['media-1'],
      fields: { accessLevel: 'publico' },
    });

    expect(result.ok).toBe(true);
    const media = await archiveMediaRepository.findById('media-1');
    expect(media?.accessLevel).toBe('publico');
  });

  it('rejeita lista vazia', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, {
      archiveItemId: 'item-1',
      archiveMediaIds: [],
      fields: { autor: 'X' },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('rejeita quando uma mídia não existe', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia({ id: 'media-1' }));

    const result = await useCase.execute(ctx, {
      archiveItemId: 'item-1',
      archiveMediaIds: ['media-1', 'media-inexistente'],
      fields: { autor: 'X' },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita quando uma mídia pertence a outro ArchiveItem', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia({ id: 'media-1', archiveItemId: 'item-2' }));

    const result = await useCase.execute(ctx, {
      archiveItemId: 'item-1',
      archiveMediaIds: ['media-1'],
      fields: { autor: 'X' },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('isolamento de tenant: rejeita mídia de outro tenant', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia({ id: 'media-1', tenantId: 't2' }));

    const result = await useCase.execute(ctx, {
      archiveItemId: 'item-1',
      archiveMediaIds: ['media-1'],
      fields: { autor: 'X' },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta a permissão archiveMedia:update', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia({ id: 'media-1' }));

    await expect(
      useCase.execute(
        { ...ctx, permissions: [] },
        { archiveItemId: 'item-1', archiveMediaIds: ['media-1'], fields: { autor: 'X' } },
      ),
    ).rejects.toThrow(ForbiddenError);
  });
});
