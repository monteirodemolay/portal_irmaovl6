import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveItemRepository,
  InMemoryArchiveMediaRepository,
} from '../../../test/fakes';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import { PublishArchiveItemUseCase } from './publish-archive-item.use-case';
import { PublishScheduledArchiveItemsUseCase } from './publish-scheduled-archive-items.use-case';

const NOW = new Date('2026-02-10T00:00:00Z');
const PAST = new Date('2026-02-01T00:00:00Z');
const FUTURE = new Date('2026-03-01T00:00:00Z');

const ctx: AuthContext = {
  uid: 'system',
  tenantId: 't1',
  roleId: 'system',
  permissions: ['archiveItem:publish', 'archiveMedia:update'],
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
    publicacaoStatus: 'pronto_para_publicar',
    nivelAcesso: 'irmaos',
    capaMediaId: null,
    publicarEm: PAST,
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
    caption: 'Uma legenda',
    altText: null,
    isCover: true,
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
  const clock = new FixedClock(NOW);
  const publishArchiveItem = new PublishArchiveItemUseCase({
    archiveItemRepository,
    archiveMediaRepository,
    clock,
  });
  const useCase = new PublishScheduledArchiveItemsUseCase({
    archiveItemRepository,
    publishArchiveItem,
    clock,
  });
  return { useCase, archiveItemRepository, archiveMediaRepository };
}

describe('PublishScheduledArchiveItemsUseCase', () => {
  it('publica itens agendados cuja data já venceu e limpa publicarEm', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem());
    await archiveMediaRepository.create(buildMedia());

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicados).toEqual(['item-1']);
    expect(result.value.falhas).toEqual([]);
    const updated = await archiveItemRepository.findById('item-1');
    expect(updated?.publicacaoStatus).toBe('publicado');
    expect(updated?.publicarEm).toBeNull();
  });

  it('não publica itens agendados para o futuro', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ publicarEm: FUTURE }));
    await archiveMediaRepository.create(buildMedia());

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicados).toEqual([]);
    const item = await archiveItemRepository.findById('item-1');
    expect(item?.publicacaoStatus).toBe('pronto_para_publicar');
  });

  it('não publica itens em rascunho mesmo com publicarEm vencido', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ publicacaoStatus: 'rascunho' }));
    await archiveMediaRepository.create(buildMedia());

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicados).toEqual([]);
  });

  it('publica todos os itens do lote mesmo sem Gestão vinculada (nenhum campo é obrigatório)', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ id: 'item-1', boardTermId: null }));
    await archiveMediaRepository.create(buildMedia({ id: 'media-1', archiveItemId: 'item-1' }));
    await archiveItemRepository.create(buildItem({ id: 'item-2' }));
    await archiveMediaRepository.create(buildMedia({ id: 'media-2', archiveItemId: 'item-2' }));

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicados).toEqual(['item-1', 'item-2']);
    expect(result.value.falhas).toHaveLength(0);
  });

  it('isola por tenant', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ tenantId: 't2' }));
    await archiveMediaRepository.create(buildMedia({ tenantId: 't2' }));

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicados).toEqual([]);
  });

  it('lança ForbiddenError quando falta a permissão archiveItem:publish', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ ...ctx, permissions: [] })).rejects.toThrow(ForbiddenError);
  });
});
