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
import {
  getArchiveItemPublicationBlockers,
  PublishArchiveItemUseCase,
} from './publish-archive-item.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveItem:publish', 'archiveItem:update', 'archiveMedia:update'],
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
  const useCase = new PublishArchiveItemUseCase({
    archiveItemRepository,
    archiveMediaRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
  });
  return { useCase, archiveItemRepository, archiveMediaRepository };
}

describe('getArchiveItemPublicationBlockers', () => {
  it('nunca bloqueia — Gestão, capa e legenda são opcionais na publicação (decisão do Administrador)', () => {
    expect(getArchiveItemPublicationBlockers({ boardTermId: null }, [])).toEqual([]);
    expect(
      getArchiveItemPublicationBlockers({ boardTermId: 'term-1' }, [
        buildMedia({ mediaType: 'foto', isCover: false, caption: null }),
      ]),
    ).toEqual([]);
  });
});

describe('PublishArchiveItemUseCase', () => {
  it('publica o item e todas as mídias não excluídas quando não há pendências', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem());
    await archiveMediaRepository.create(buildMedia({ id: 'media-1' }));
    await archiveMediaRepository.create(buildMedia({ id: 'media-2', isCover: false }));

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicacaoStatus).toBe('publicado');
    expect((await archiveMediaRepository.findById('media-1'))?.publicacaoStatus).toBe('publicado');
    expect((await archiveMediaRepository.findById('media-2'))?.publicacaoStatus).toBe('publicado');
  });

  it('publica mesmo sem Gestão, capa ou legenda (nenhum campo é obrigatório)', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ boardTermId: null }));
    await archiveMediaRepository.create(buildMedia({ isCover: false, caption: null }));

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicacaoStatus).toBe('publicado');
  });

  it('permite publicar a partir de pronto_para_publicar', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ publicacaoStatus: 'pronto_para_publicar' }));
    await archiveMediaRepository.create(buildMedia());

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(true);
  });

  it('rejeita publicar item já publicado', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ publicacaoStatus: 'publicado' }));

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('rejeita item inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'nao-existe');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('isolamento de tenant', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ tenantId: 't2' }));

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta a permissão archiveItem:publish', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem());

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'item-1')).rejects.toThrow(
      ForbiddenError,
    );
  });
});
