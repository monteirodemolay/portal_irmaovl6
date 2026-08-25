import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveItemRepository,
  InMemoryArchiveMediaRepository,
  InMemoryBoardTermRepository,
  InMemoryEventRepository,
  InMemoryFileAssetRepository,
  InMemoryLibraryItemRepository,
  InMemoryMediaAssetRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Event } from '../../agenda/entities/event.entity';
import type { BoardTerm } from '../../governance/entities/board-term.entity';
import type { FileAsset } from '../../document-management/entities/file-asset.entity';
import type { LibraryItem } from '../../library/entities/library-item.entity';
import { MIGRATED_MEDIA_SHA256_PLACEHOLDER } from './migrate-gallery-album.use-case';
import { MigrateLibraryItemUseCase } from './migrate-library-item.use-case';

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

function buildFile(overrides: Partial<FileAsset> = {}): FileAsset {
  return {
    id: 'file-1',
    tenantId: 't1',
    titulo: 'Ritual de Iniciação',
    descricao: 'Edição revisada',
    categoriaId: 'cat-1',
    acervo: null,
    autor: 'Biblioteca',
    tipo: 'pdf',
    urlArquivo: 'https://blob.vercel-storage.com/tenants/t1/files/ritual.pdf',
    urlMiniatura: null,
    versao: 1,
    publicado: true,
    permitirDownload: false,
    contagemDownloads: 0,
    contagemVisualizacoes: 0,
    dataPublicacao: new Date('2025-01-01'),
    ordem: 0,
    tamanhoBytes: 512000,
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

function buildLibraryItem(overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id: 'library-1',
    tenantId: 't1',
    fileId: 'file-1',
    categoriaId: 'cat-1',
    subcategoriaId: null,
    permiteLeituraOnline: true,
    contagemDownloads: 0,
    contagemVisualizacoes: 0,
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const libraryItemRepository = new InMemoryLibraryItemRepository();
  const fileAssetRepository = new InMemoryFileAssetRepository();
  const eventRepository = new InMemoryEventRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const archiveMediaRepository = new InMemoryArchiveMediaRepository();
  const mediaAssetRepository = new InMemoryMediaAssetRepository();
  const useCase = new MigrateLibraryItemUseCase({
    libraryItemRepository,
    fileAssetRepository,
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
    libraryItemRepository,
    fileAssetRepository,
    eventRepository,
    boardTermRepository,
    archiveItemRepository,
    archiveMediaRepository,
    mediaAssetRepository,
  };
}

const baseInput = { libraryItemId: 'library-1', eventId: 'event-1' };

describe('MigrateLibraryItemUseCase', () => {
  it('rejeita quando o item da Biblioteca não existe', async () => {
    const { useCase, eventRepository } = buildUseCase();
    await eventRepository.create(buildEvent());

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita quando o item pertence a outro tenant', async () => {
    const { useCase, libraryItemRepository, fileAssetRepository, eventRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile());
    await libraryItemRepository.create(buildLibraryItem({ tenantId: 't2' }));
    await eventRepository.create(buildEvent());

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita quando o FileAsset associado não existe mais', async () => {
    const { useCase, libraryItemRepository, eventRepository } = buildUseCase();
    await libraryItemRepository.create(buildLibraryItem());
    await eventRepository.create(buildEvent());

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita quando o evento não existe', async () => {
    const { useCase, libraryItemRepository, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile());
    await libraryItemRepository.create(buildLibraryItem());

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('migra o item resolvendo o FileAsset associado, com origemLibraryItemId marcado e origem intocada', async () => {
    const {
      useCase,
      libraryItemRepository,
      fileAssetRepository,
      eventRepository,
      boardTermRepository,
      archiveMediaRepository,
      mediaAssetRepository,
    } = buildUseCase();
    const file = buildFile();
    await fileAssetRepository.create(file);
    await libraryItemRepository.create(buildLibraryItem());
    await eventRepository.create(buildEvent());
    await boardTermRepository.create(term);

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicacaoStatus).toBe('rascunho');
    expect(result.value.origemLibraryItemId).toBe('library-1');
    expect(result.value.origemFileAssetId).toBeUndefined();
    expect(result.value.titulo).toBe('Ritual de Iniciação');
    expect(result.value.boardTermId).toBe('term-1');

    const archiveMedias = await archiveMediaRepository.findByArchiveItemId(result.value.id);
    expect(archiveMedias).toHaveLength(1);
    expect(archiveMedias[0]?.allowDownload).toBe(false); // FileAsset.permitirDownload

    const asset = await mediaAssetRepository.findById(archiveMedias[0]!.mediaAssetId);
    expect(asset?.storageKey).toBe(file.urlArquivo);
    expect(asset?.size).toBe(512000);
    expect(asset?.sha256).toBe(MIGRATED_MEDIA_SHA256_PLACEHOLDER);

    // Origem intocada
    expect((await libraryItemRepository.findById('library-1'))?.deletedAt).toBeNull();
    expect((await fileAssetRepository.findById('file-1'))?.deletedAt).toBeNull();
  });

  it('rejeita quando o item já foi migrado para o mesmo evento', async () => {
    const { useCase, libraryItemRepository, fileAssetRepository, eventRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile());
    await libraryItemRepository.create(buildLibraryItem());
    await eventRepository.create(buildEvent());

    const first = await useCase.execute(ctx, baseInput);
    expect(first.ok).toBe(true);

    const second = await useCase.execute(ctx, baseInput);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toBeInstanceOf(ConflictError);
  });

  it('lança ForbiddenError quando falta a permissão archiveItem:create', async () => {
    const { useCase, libraryItemRepository, fileAssetRepository, eventRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile());
    await libraryItemRepository.create(buildLibraryItem());
    await eventRepository.create(buildEvent());

    await expect(useCase.execute({ ...ctx, permissions: [] }, baseInput)).rejects.toThrow(
      ForbiddenError,
    );
  });
});
