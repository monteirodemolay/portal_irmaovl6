import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, ValidationError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveItemRepository,
  InMemoryArchiveMediaRepository,
} from '../../../test/fakes';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import { MergeArchiveItemsUseCase } from './merge-archive-items.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveItem:delete'],
};

function buildItem(overrides: Partial<ArchiveItem>): ArchiveItem {
  return {
    id: 'canonical',
    tenantId: 't1',
    eventId: 'event-1',
    boardTermId: null,
    titulo: 'Iniciação — 01/03/2026',
    tipo: 'documento',
    descricao: null,
    publicacaoStatus: 'rascunho',
    nivelAcesso: 'irmaos',
    capaMediaId: null,
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    origemIniciacaoMemberIds: ['member-a'],
    ...overrides,
  };
}

function buildMedia(overrides: Partial<ArchiveMedia>): ArchiveMedia {
  return {
    id: 'media-1',
    tenantId: 't1',
    eventId: 'event-1',
    boardTermId: null,
    archiveItemId: 'duplicate',
    mediaAssetId: 'asset-1',
    mediaType: 'foto',
    order: 0,
    caption: null,
    altText: null,
    isCover: false,
    isFeatured: false,
    allowDownload: false,
    autor: null,
    tags: [],
    documentType: null,
    role: null,
    accessLevel: 'irmaos',
    publicacaoStatus: 'rascunho',
    pessoasIdentificadas: [],
    focalX: null,
    focalY: null,
    posterMediaAssetId: null,
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
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
  const useCase = new MergeArchiveItemsUseCase({
    archiveItemRepository,
    archiveMediaRepository,
    clock: new FixedClock(new Date('2026-03-05T00:00:00Z')),
  });
  return { useCase, archiveItemRepository, archiveMediaRepository };
}

describe('MergeArchiveItemsUseCase', () => {
  it('funde origemIniciacaoMemberIds, reatribui mídia e arquiva a duplicata', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ id: 'canonical' }));
    await archiveItemRepository.create(
      buildItem({ id: 'duplicate', origemIniciacaoMemberIds: ['member-b'] }),
    );
    await archiveMediaRepository.create(buildMedia({ id: 'media-1', archiveItemId: 'duplicate' }));

    const result = await useCase.execute(ctx, 'canonical', ['duplicate']);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.itensMesclados).toBe(1);
    expect(result.value.midiasReatribuidas).toBe(1);

    const canonical = await archiveItemRepository.findById('canonical');
    expect(canonical?.origemIniciacaoMemberIds).toEqual(
      expect.arrayContaining(['member-a', 'member-b']),
    );

    const duplicate = await archiveItemRepository.findById('duplicate');
    expect(duplicate?.deletedAt).not.toBeNull();

    const media = await archiveMediaRepository.findById('media-1');
    expect(media?.archiveItemId).toBe('canonical');
  });

  it('nunca mescla itens de tipo diferente (Iniciação com Elevação)', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ id: 'canonical', tipo: 'documento' }));
    await archiveItemRepository.create(
      buildItem({ id: 'duplicate', tipo: 'fotografia', origemElevacaoMemberIds: ['member-b'] }),
    );

    const result = await useCase.execute(ctx, 'canonical', ['duplicate']);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.itensMesclados).toBe(0);

    const duplicate = await archiveItemRepository.findById('duplicate');
    expect(duplicate?.deletedAt).toBeNull();
  });

  it('rejeita quando nenhuma duplicata válida é informada', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ id: 'canonical' }));

    const result = await useCase.execute(ctx, 'canonical', []);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('lança ForbiddenError sem a permissão archiveItem:delete', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ id: 'canonical' }));
    await archiveItemRepository.create(buildItem({ id: 'duplicate' }));

    await expect(
      useCase.execute({ ...ctx, permissions: [] }, 'canonical', ['duplicate']),
    ).rejects.toThrow(ForbiddenError);
  });
});
