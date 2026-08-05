import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryFileAssetRepository,
  InMemoryLibraryItemRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { FileAsset } from '../../document-management/entities/file-asset.entity';
import { AddLibraryItemUseCase, type AddLibraryItemInput } from './add-library-item.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['libraryItem:create'],
};

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

function buildInput(overrides: Partial<AddLibraryItemInput> = {}): AddLibraryItemInput {
  return {
    fileId: 'file-1',
    categoriaId: 'cat-1',
    subcategoriaId: null,
    permiteLeituraOnline: true,
    ...overrides,
  };
}

function buildUseCase() {
  const libraryItemRepository = new InMemoryLibraryItemRepository();
  const fileAssetRepository = new InMemoryFileAssetRepository();
  const useCase = new AddLibraryItemUseCase({
    libraryItemRepository,
    fileAssetRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, libraryItemRepository, fileAssetRepository };
}

describe('AddLibraryItemUseCase', () => {
  it('exige a permissão libraryItem:create', async () => {
    const { useCase, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile());
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, buildInput())).rejects.toThrow(ForbiddenError);
  });

  it('cataloga o FileAsset existente sem duplicar o binário', async () => {
    const { useCase, libraryItemRepository, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile());

    const result = await useCase.execute(ctx, buildInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fileId).toBe('file-1');
    expect(result.value.contagemDownloads).toBe(0);
    expect(result.value.contagemVisualizacoes).toBe(0);
    expect(await libraryItemRepository.findById(result.value.id)).not.toBeNull();
  });

  it('rejeita quando o FileAsset não existe', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, buildInput({ fileId: 'inexistente' }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('rejeita quando o FileAsset pertence a outro tenant', async () => {
    const { useCase, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile({ tenantId: 'outro-tenant' }));

    const result = await useCase.execute(ctx, buildInput());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
