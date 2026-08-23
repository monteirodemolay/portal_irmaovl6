import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import { InMemoryArchiveMediaRepository } from '../../../test/fakes';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import { RestoreArchiveMediaUseCase } from './restore-archive-media.use-case';

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
    deletedAt: new Date('2026-01-15'),
    status: 'archived',
    ativo: false,
    ...overrides,
  };
}

function buildUseCase() {
  const archiveMediaRepository = new InMemoryArchiveMediaRepository();
  const useCase = new RestoreArchiveMediaUseCase({ archiveMediaRepository });
  return { useCase, archiveMediaRepository };
}

describe('RestoreArchiveMediaUseCase', () => {
  it('restaura a mídia (limpa deletedAt)', async () => {
    const { useCase, archiveMediaRepository } = buildUseCase();
    await archiveMediaRepository.create(buildMedia({ id: 'media-1' }));

    const result = await useCase.execute(ctx, 'media-1');

    expect(result.ok).toBe(true);
    const media = await archiveMediaRepository.findById('media-1');
    expect(media?.deletedAt).toBeNull();
    expect(media?.ativo).toBe(true);
  });

  it('rejeita mídia inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'nao-existe');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('isolamento de tenant: não restaura mídia de outro tenant', async () => {
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
