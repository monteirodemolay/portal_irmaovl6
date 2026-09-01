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
import { ScheduleArchiveItemPublicationUseCase } from './schedule-archive-item-publication.use-case';

const NOW = new Date('2026-02-01T00:00:00Z');
const FUTURE = new Date('2026-02-10T12:00:00Z');
const PAST = new Date('2026-01-01T00:00:00Z');

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveItem:publish'],
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
    publicarEm: null,
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
  const useCase = new ScheduleArchiveItemPublicationUseCase({
    archiveItemRepository,
    archiveMediaRepository,
    clock: new FixedClock(NOW),
  });
  return { useCase, archiveItemRepository, archiveMediaRepository };
}

describe('ScheduleArchiveItemPublicationUseCase', () => {
  it('agenda a publicação quando não há pendências e a data é futura', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem());
    await archiveMediaRepository.create(buildMedia());

    const result = await useCase.execute(ctx, 'item-1', FUTURE);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicarEm).toEqual(FUTURE);
    expect(result.value.publicacaoStatus).toBe('pronto_para_publicar');
  });

  it('cancela o agendamento (publicarEm: null) mesmo com pendências', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(
      buildItem({
        boardTermId: null,
        publicarEm: FUTURE,
        publicacaoStatus: 'pronto_para_publicar',
      }),
    );

    const result = await useCase.execute(ctx, 'item-1', null);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicarEm).toBeNull();
  });

  it('agenda mesmo sem Gestão vinculada (nenhum campo é obrigatório)', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ boardTermId: null }));
    await archiveMediaRepository.create(buildMedia());

    const result = await useCase.execute(ctx, 'item-1', FUTURE);

    expect(result.ok).toBe(true);
  });

  it('rejeita data no passado', async () => {
    const { useCase, archiveItemRepository, archiveMediaRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem());
    await archiveMediaRepository.create(buildMedia());

    const result = await useCase.execute(ctx, 'item-1', PAST);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('rejeita agendar item já publicado', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ publicacaoStatus: 'publicado' }));

    const result = await useCase.execute(ctx, 'item-1', FUTURE);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('rejeita item inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'nao-existe', FUTURE);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('isolamento de tenant', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ tenantId: 't2' }));

    const result = await useCase.execute(ctx, 'item-1', FUTURE);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta a permissão archiveItem:publish', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem());

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'item-1', FUTURE)).rejects.toThrow(
      ForbiddenError,
    );
  });
});
