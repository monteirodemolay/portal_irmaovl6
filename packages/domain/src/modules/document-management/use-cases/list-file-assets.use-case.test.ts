import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryFileAssetRepository } from '../../../test/fakes';
import type { FileAsset } from '../entities/file-asset.entity';
import {
  ListAllFileAssetsUseCase,
  ListPublishedFilesByCategoryUseCase,
} from './list-file-assets.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: ['file:read'] };

function buildFile(overrides: Partial<FileAsset> = {}): FileAsset {
  return {
    id: 'file-1',
    tenantId: 't1',
    titulo: 'Ata',
    descricao: null,
    categoriaId: 'cat-1',
    acervo: null,
    autor: null,
    tipo: 'pdf',
    urlArquivo: 'https://example.com/a.pdf',
    urlMiniatura: null,
    versao: 1,
    publicado: true,
    permitirDownload: true,
    contagemDownloads: 0,
    contagemVisualizacoes: 0,
    dataPublicacao: new Date('2026-01-01'),
    ordem: 0,
    tamanhoBytes: 1000,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'u1',
    updatedBy: 'u1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('ListAllFileAssetsUseCase', () => {
  it('lista rascunhos e publicados do tenant, respeitando o limite da página', async () => {
    const repository = new InMemoryFileAssetRepository();
    await repository.create(buildFile({ id: 'file-1', publicado: false, status: 'draft' }));
    await repository.create(buildFile({ id: 'file-2', publicado: true }));
    await repository.create(buildFile({ id: 'file-3', tenantId: 'outro-tenant' }));
    const useCase = new ListAllFileAssetsUseCase({ fileAssetRepository: repository });

    const result = await useCase.execute(ctx, { limit: 1 });

    expect(result.items).toHaveLength(1);
    expect(result.items.every((f) => f.tenantId === 't1')).toBe(true);
  });

  it('lança ForbiddenError quando falta a permissão file:read', async () => {
    const repository = new InMemoryFileAssetRepository();
    const useCase = new ListAllFileAssetsUseCase({ fileAssetRepository: repository });

    await expect(useCase.execute({ ...ctx, permissions: [] }, { limit: 20 })).rejects.toThrow(
      ForbiddenError,
    );
  });
});

describe('ListPublishedFilesByCategoryUseCase', () => {
  it('lista apenas arquivos publicados da categoria informada', async () => {
    const repository = new InMemoryFileAssetRepository();
    await repository.create(buildFile({ id: 'file-1', categoriaId: 'cat-1', publicado: true }));
    await repository.create(buildFile({ id: 'file-2', categoriaId: 'cat-1', publicado: false }));
    await repository.create(buildFile({ id: 'file-3', categoriaId: 'cat-2', publicado: true }));
    const useCase = new ListPublishedFilesByCategoryUseCase({ fileAssetRepository: repository });

    const result = await useCase.execute(ctx, 'cat-1', { limit: 20 });

    expect(result.items.map((f) => f.id)).toEqual(['file-1']);
  });

  it('retorna lista vazia quando a categoria não tem arquivos publicados', async () => {
    const repository = new InMemoryFileAssetRepository();
    await repository.create(buildFile({ id: 'file-1', categoriaId: 'cat-1', publicado: false }));
    const useCase = new ListPublishedFilesByCategoryUseCase({ fileAssetRepository: repository });

    const result = await useCase.execute(ctx, 'cat-1', { limit: 20 });

    expect(result.items).toEqual([]);
  });
});
