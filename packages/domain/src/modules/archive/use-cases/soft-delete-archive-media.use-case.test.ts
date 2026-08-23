import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryArchiveMediaRepository } from '../../../test/fakes';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import { SoftDeleteArchiveMediaUseCase } from './soft-delete-archive-media.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveMedia:delete'],
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
  const useCase = new SoftDeleteArchiveMediaUseCase({
    archiveMediaRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
  });
  return { useCase, archiveMediaRepository };
}

describe('SoftDeleteArchiveMediaUseCase', () => {
  it('move só a mídia para a lixeira, sem afetar o item nem as demais mídias', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia({ id: 'media-1' }));
    await archiveMediaRepository.create(buildMedia({ id: 'media-2' }));

    const result = await useCase.execute(ctx, 'media-1');

    expect(result.ok).toBe(true);
    const media1 = await archiveMediaRepository.findById('media-1');
    expect(media1?.deletedAt).not.toBeNull();
    expect(media1?.ativo).toBe(false);
    const media2 = await archiveMediaRepository.findById('media-2');
    expect(media2?.deletedAt).toBeNull();
  });

  it('rejeita mídia inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'nao-existe');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('isolamento de tenant: não exclui mídia de outro tenant', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia({ id: 'media-1', tenantId: 't2' }));

    const result = await useCase.execute(ctx, 'media-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta a permissão archiveMedia:delete', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia({ id: 'media-1' }));

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'media-1')).rejects.toThrow(
      ForbiddenError,
    );
  });
});
