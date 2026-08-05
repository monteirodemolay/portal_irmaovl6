import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryFileAssetRepository, InMemoryLibraryItemRepository } from '../../../test/fakes';
import type { FileAsset } from '../../document-management/entities/file-asset.entity';
import type { LibraryItem } from '../entities/library-item.entity';
import {
  RecordLibraryDownloadUseCase,
  RecordLibraryViewUseCase,
} from './record-library-interaction.use-case';

const ctx: AuthContext = {
  uid: 'u1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['libraryItem:read'],
};

function buildItem(overrides: Partial<LibraryItem> = {}): LibraryItem {
  return {
    id: 'item-1',
    tenantId: 't1',
    fileId: 'file-1',
    categoriaId: 'cat-1',
    subcategoriaId: null,
    permiteLeituraOnline: true,
    contagemDownloads: 0,
    contagemVisualizacoes: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildFile(overrides: Partial<FileAsset> = {}): FileAsset {
  return {
    id: 'file-1',
    tenantId: 't1',
    titulo: 'Regulamento Interno',
    descricao: null,
    categoriaId: 'cat-1',
    acervo: null,
    autor: null,
    tipo: 'pdf',
    urlArquivo: 'https://arquivos.vl6.org.br/regulamento.pdf',
    urlMiniatura: null,
    versao: 1,
    publicado: true,
    permitirDownload: true,
    contagemDownloads: 0,
    contagemVisualizacoes: 0,
    dataPublicacao: new Date('2026-01-01'),
    ordem: 0,
    tamanhoBytes: 1024,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('RecordLibraryViewUseCase', () => {
  it('exige a permissão libraryItem:read', async () => {
    const libraryItemRepository = new InMemoryLibraryItemRepository();
    const fileAssetRepository = new InMemoryFileAssetRepository();
    const useCase = new RecordLibraryViewUseCase({ libraryItemRepository, fileAssetRepository });
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, 'item-1')).rejects.toThrow(ForbiddenError);
  });

  it('rejeita quando o item não existe', async () => {
    const libraryItemRepository = new InMemoryLibraryItemRepository();
    const fileAssetRepository = new InMemoryFileAssetRepository();
    const useCase = new RecordLibraryViewUseCase({ libraryItemRepository, fileAssetRepository });

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('rejeita quando o item não permite leitura online', async () => {
    const libraryItemRepository = new InMemoryLibraryItemRepository();
    await libraryItemRepository.create(buildItem({ permiteLeituraOnline: false }));
    const fileAssetRepository = new InMemoryFileAssetRepository();
    const useCase = new RecordLibraryViewUseCase({ libraryItemRepository, fileAssetRepository });

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('forbidden');
  });

  it('incrementa a contagem de visualizações quando permitido', async () => {
    const libraryItemRepository = new InMemoryLibraryItemRepository();
    await libraryItemRepository.create(buildItem());
    const fileAssetRepository = new InMemoryFileAssetRepository();
    const useCase = new RecordLibraryViewUseCase({ libraryItemRepository, fileAssetRepository });

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(true);
    const atualizado = await libraryItemRepository.findById('item-1');
    expect(atualizado?.contagemVisualizacoes).toBe(1);
  });
});

describe('RecordLibraryDownloadUseCase', () => {
  it('exige a permissão libraryItem:read', async () => {
    const libraryItemRepository = new InMemoryLibraryItemRepository();
    const fileAssetRepository = new InMemoryFileAssetRepository();
    const useCase = new RecordLibraryDownloadUseCase({
      libraryItemRepository,
      fileAssetRepository,
    });
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, 'item-1')).rejects.toThrow(ForbiddenError);
  });

  it('rejeita quando o item não existe', async () => {
    const libraryItemRepository = new InMemoryLibraryItemRepository();
    const fileAssetRepository = new InMemoryFileAssetRepository();
    const useCase = new RecordLibraryDownloadUseCase({
      libraryItemRepository,
      fileAssetRepository,
    });

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('rejeita quando o FileAsset subjacente não permite download', async () => {
    const libraryItemRepository = new InMemoryLibraryItemRepository();
    await libraryItemRepository.create(buildItem());
    const fileAssetRepository = new InMemoryFileAssetRepository();
    await fileAssetRepository.create(buildFile({ permitirDownload: false }));
    const useCase = new RecordLibraryDownloadUseCase({
      libraryItemRepository,
      fileAssetRepository,
    });

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('forbidden');
  });

  it('incrementa a contagem de downloads quando permitido', async () => {
    const libraryItemRepository = new InMemoryLibraryItemRepository();
    await libraryItemRepository.create(buildItem());
    const fileAssetRepository = new InMemoryFileAssetRepository();
    await fileAssetRepository.create(buildFile());
    const useCase = new RecordLibraryDownloadUseCase({
      libraryItemRepository,
      fileAssetRepository,
    });

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(true);
    const atualizado = await libraryItemRepository.findById('item-1');
    expect(atualizado?.contagemDownloads).toBe(1);
  });
});
