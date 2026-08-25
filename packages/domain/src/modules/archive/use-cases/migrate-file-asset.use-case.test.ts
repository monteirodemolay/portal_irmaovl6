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
  InMemoryMediaAssetRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Event } from '../../agenda/entities/event.entity';
import type { BoardTerm } from '../../governance/entities/board-term.entity';
import type { FileAsset } from '../../document-management/entities/file-asset.entity';
import { MIGRATED_MEDIA_SHA256_PLACEHOLDER } from './migrate-gallery-album.use-case';
import { MigrateFileAssetUseCase } from './migrate-file-asset.use-case';

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
    titulo: 'Estatuto da Loja',
    descricao: 'Texto vigente',
    categoriaId: 'cat-1',
    acervo: null,
    autor: 'Secretaria',
    tipo: 'pdf',
    urlArquivo: 'https://blob.vercel-storage.com/tenants/t1/files/estatuto.pdf',
    urlMiniatura: null,
    versao: 1,
    publicado: true,
    permitirDownload: true,
    contagemDownloads: 0,
    contagemVisualizacoes: 0,
    dataPublicacao: new Date('2025-01-01'),
    ordem: 0,
    tamanhoBytes: 204800,
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

function buildUseCase() {
  const fileAssetRepository = new InMemoryFileAssetRepository();
  const eventRepository = new InMemoryEventRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const archiveMediaRepository = new InMemoryArchiveMediaRepository();
  const mediaAssetRepository = new InMemoryMediaAssetRepository();
  const useCase = new MigrateFileAssetUseCase({
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
    fileAssetRepository,
    eventRepository,
    boardTermRepository,
    archiveItemRepository,
    archiveMediaRepository,
    mediaAssetRepository,
  };
}

const baseInput = { fileId: 'file-1', eventId: 'event-1' };

describe('MigrateFileAssetUseCase', () => {
  it('rejeita quando o arquivo não existe', async () => {
    const { useCase, eventRepository } = buildUseCase();
    await eventRepository.create(buildEvent());

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita quando o arquivo pertence a outro tenant', async () => {
    const { useCase, fileAssetRepository, eventRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile({ tenantId: 't2' }));
    await eventRepository.create(buildEvent());

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita quando o arquivo já foi excluído', async () => {
    const { useCase, fileAssetRepository, eventRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile({ deletedAt: new Date('2025-07-01') }));
    await eventRepository.create(buildEvent());

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita quando o evento não existe', async () => {
    const { useCase, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile());

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('migra o arquivo criando um ArchiveItem em rascunho, uma ArchiveMedia e um MediaAsset com o tamanho real, sem apagar a origem', async () => {
    const {
      useCase,
      fileAssetRepository,
      eventRepository,
      boardTermRepository,
      archiveMediaRepository,
      mediaAssetRepository,
    } = buildUseCase();
    const file = buildFile();
    await fileAssetRepository.create(file);
    await eventRepository.create(buildEvent());
    await boardTermRepository.create(term);

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicacaoStatus).toBe('rascunho');
    expect(result.value.eventId).toBe('event-1');
    expect(result.value.boardTermId).toBe('term-1');
    expect(result.value.origemFileAssetId).toBe('file-1');
    expect(result.value.titulo).toBe('Estatuto da Loja');
    expect(result.value.tipo).toBe('documento'); // pdf

    const archiveMedias = await archiveMediaRepository.findByArchiveItemId(result.value.id);
    expect(archiveMedias).toHaveLength(1);
    expect(archiveMedias[0]?.mediaType).toBe('documento');
    expect(archiveMedias[0]?.publicacaoStatus).toBe('rascunho');
    expect(archiveMedias[0]?.allowDownload).toBe(true);
    expect(archiveMedias[0]?.autor).toBe('Secretaria');

    const asset = await mediaAssetRepository.findById(archiveMedias[0]!.mediaAssetId);
    expect(asset?.storageKey).toBe(file.urlArquivo);
    expect(asset?.size).toBe(204800); // tamanho real, diferente da migração da Galeria
    expect(asset?.sha256).toBe(MIGRATED_MEDIA_SHA256_PLACEHOLDER);

    // Origem intocada
    expect((await fileAssetRepository.findById('file-1'))?.deletedAt).toBeNull();
  });

  it('classifica vídeo como audiovisual e imagem como fotografia', async () => {
    const { useCase, fileAssetRepository, eventRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile({ id: 'file-video', tipo: 'video' }));
    await eventRepository.create(buildEvent());

    const result = await useCase.execute(ctx, { fileId: 'file-video', eventId: 'event-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tipo).toBe('audiovisual');
  });

  it('rejeita quando o arquivo já foi migrado para o mesmo evento', async () => {
    const { useCase, fileAssetRepository, eventRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile());
    await eventRepository.create(buildEvent());

    const first = await useCase.execute(ctx, baseInput);
    expect(first.ok).toBe(true);

    const second = await useCase.execute(ctx, baseInput);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toBeInstanceOf(ConflictError);
  });

  it('lança ForbiddenError quando falta a permissão archiveItem:create', async () => {
    const { useCase, fileAssetRepository, eventRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile());
    await eventRepository.create(buildEvent());

    await expect(useCase.execute({ ...ctx, permissions: [] }, baseInput)).rejects.toThrow(
      ForbiddenError,
    );
  });
});
