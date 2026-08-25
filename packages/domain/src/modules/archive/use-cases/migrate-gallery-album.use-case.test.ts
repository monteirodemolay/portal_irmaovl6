import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveItemRepository,
  InMemoryArchiveMediaRepository,
  InMemoryBoardTermRepository,
  InMemoryEventRepository,
  InMemoryGalleryAlbumRepository,
  InMemoryGalleryMediaRepository,
  InMemoryMediaAssetRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Event } from '../../agenda/entities/event.entity';
import type { BoardTerm } from '../../governance/entities/board-term.entity';
import type { GalleryAlbum } from '../../gallery/entities/gallery-album.entity';
import type { GalleryMedia } from '../../gallery/entities/gallery-media.entity';
import {
  MIGRATED_MEDIA_SHA256_PLACEHOLDER,
  MigrateGalleryAlbumUseCase,
} from './migrate-gallery-album.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveItem:create'],
};

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    tenantId: 't1',
    tipo: 'sessao',
    titulo: 'Sessão Magna de Posse',
    descricao: null,
    local: 'Sede da Loja',
    dataInicio: new Date('2025-06-15T20:00:00Z'),
    dataFim: null,
    exigeConfirmacaoPresenca: false,
    capacidadeMaxima: null,
    traje: null,
    chegadaSugerida: null,
    observacoes: null,
    arquivosRelacionados: [],
    boardTermId: null,
    nivelAcesso: 'irmaos',
    exibirNaLinhaDoTempo: true,
    grau: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

const term: BoardTerm = {
  id: 'term-1',
  tenantId: 't1',
  nome: 'Gestão 2025/2026',
  periodoInicio: new Date('2025-01-01'),
  periodoFim: new Date('2025-12-31'),
  createdAt: new Date('2024-12-01'),
  updatedAt: new Date('2024-12-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

function buildAlbum(overrides: Partial<GalleryAlbum> = {}): GalleryAlbum {
  return {
    id: 'album-1',
    tenantId: 't1',
    titulo: 'Sessão Magna de Posse 2025',
    categoria: 'sessoes',
    capaUrl: null,
    dataEvento: new Date('2025-06-15'),
    createdAt: new Date('2025-06-16'),
    updatedAt: new Date('2025-06-16'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildMedia(overrides: Partial<GalleryMedia> = {}): GalleryMedia {
  return {
    id: 'media-1',
    tenantId: 't1',
    albumId: 'album-1',
    tipo: 'foto',
    url: 'https://blob.vercel-storage.com/tenants/t1/gallery/foto-1.jpg',
    urlMiniatura: null,
    ordem: 0,
    createdAt: new Date('2025-06-16'),
    updatedAt: new Date('2025-06-16'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const galleryAlbumRepository = new InMemoryGalleryAlbumRepository();
  const galleryMediaRepository = new InMemoryGalleryMediaRepository();
  const eventRepository = new InMemoryEventRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const archiveMediaRepository = new InMemoryArchiveMediaRepository();
  const mediaAssetRepository = new InMemoryMediaAssetRepository();
  const useCase = new MigrateGalleryAlbumUseCase({
    galleryAlbumRepository,
    galleryMediaRepository,
    eventRepository,
    boardTermRepository,
    archiveItemRepository,
    archiveMediaRepository,
    mediaAssetRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return {
    useCase,
    galleryAlbumRepository,
    galleryMediaRepository,
    eventRepository,
    boardTermRepository,
    archiveItemRepository,
    archiveMediaRepository,
    mediaAssetRepository,
  };
}

const baseInput = { albumId: 'album-1', eventId: 'event-1' };

describe('MigrateGalleryAlbumUseCase', () => {
  it('rejeita quando o álbum não existe', async () => {
    const { useCase, eventRepository } = buildUseCase();
    await eventRepository.create(buildEvent());

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita quando o álbum pertence a outro tenant', async () => {
    const { useCase, galleryAlbumRepository, eventRepository } = buildUseCase();
    await galleryAlbumRepository.create(buildAlbum({ tenantId: 't2' }));
    await eventRepository.create(buildEvent());

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita quando o álbum já foi excluído', async () => {
    const { useCase, galleryAlbumRepository, eventRepository } = buildUseCase();
    await galleryAlbumRepository.create(buildAlbum({ deletedAt: new Date('2025-07-01') }));
    await eventRepository.create(buildEvent());

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita quando o evento não existe', async () => {
    const { useCase, galleryAlbumRepository } = buildUseCase();
    await galleryAlbumRepository.create(buildAlbum());

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('migra o álbum criando um ArchiveItem em rascunho, ArchiveMedia e MediaAsset por mídia, preservando ordem e sem apagar a origem', async () => {
    const {
      useCase,
      galleryAlbumRepository,
      galleryMediaRepository,
      eventRepository,
      boardTermRepository,
      archiveMediaRepository,
      mediaAssetRepository,
    } = buildUseCase();
    const album = buildAlbum();
    await galleryAlbumRepository.create(album);
    await eventRepository.create(buildEvent());
    await boardTermRepository.create(term);
    const media1 = buildMedia({ id: 'media-1', ordem: 0, tipo: 'foto' });
    const media2 = buildMedia({
      id: 'media-2',
      ordem: 1,
      tipo: 'video',
      url: 'https://blob.vercel-storage.com/x/video.mp4',
    });
    await galleryMediaRepository.create(media1);
    await galleryMediaRepository.create(media2);

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicacaoStatus).toBe('rascunho');
    expect(result.value.eventId).toBe('event-1');
    expect(result.value.boardTermId).toBe('term-1');
    expect(result.value.origemGalleryAlbumId).toBe('album-1');
    expect(result.value.tipo).toBe('audiovisual'); // tem vídeo no álbum

    const archiveMedias = await archiveMediaRepository.findByArchiveItemId(result.value.id);
    expect(archiveMedias).toHaveLength(2);
    expect(archiveMedias[0]?.mediaType).toBe('foto');
    expect(archiveMedias[0]?.order).toBe(0);
    expect(archiveMedias[1]?.mediaType).toBe('video');
    expect(archiveMedias[1]?.order).toBe(1);
    expect(archiveMedias.every((m) => m.publicacaoStatus === 'rascunho')).toBe(true);

    const assets = await Promise.all(
      archiveMedias.map((m) => mediaAssetRepository.findById(m.mediaAssetId)),
    );
    expect(assets[0]?.storageKey).toBe(media1.url);
    expect(assets[1]?.storageKey).toBe(media2.url);
    expect(assets.every((a) => a?.sha256 === MIGRATED_MEDIA_SHA256_PLACEHOLDER)).toBe(true);

    // Origem intocada
    expect((await galleryAlbumRepository.findById('album-1'))?.deletedAt).toBeNull();
    expect(await galleryMediaRepository.listByAlbum('album-1')).toHaveLength(2);
  });

  it('rejeita quando o álbum já foi migrado para o mesmo evento', async () => {
    const { useCase, galleryAlbumRepository, galleryMediaRepository, eventRepository } =
      buildUseCase();
    await galleryAlbumRepository.create(buildAlbum());
    await eventRepository.create(buildEvent());
    await galleryMediaRepository.create(buildMedia());

    const first = await useCase.execute(ctx, baseInput);
    expect(first.ok).toBe(true);

    const second = await useCase.execute(ctx, baseInput);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toBeInstanceOf(ConflictError);
  });

  it('lança ForbiddenError quando falta a permissão archiveItem:create', async () => {
    const { useCase, galleryAlbumRepository, eventRepository } = buildUseCase();
    await galleryAlbumRepository.create(buildAlbum());
    await eventRepository.create(buildEvent());

    await expect(useCase.execute({ ...ctx, permissions: [] }, baseInput)).rejects.toThrow(
      ForbiddenError,
    );
  });
});
