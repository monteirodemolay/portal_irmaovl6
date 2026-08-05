import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryLibraryItemRepository } from '../../../test/fakes';
import type { LibraryItem } from '../entities/library-item.entity';
import {
  ListAllLibraryItemsUseCase,
  ListLibraryItemsByCategoryUseCase,
} from './list-library-items.use-case';

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

describe('ListLibraryItemsByCategoryUseCase', () => {
  it('exige a permissão libraryItem:read', async () => {
    const repo = new InMemoryLibraryItemRepository();
    const useCase = new ListLibraryItemsByCategoryUseCase({ libraryItemRepository: repo });
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, 'cat-1')).rejects.toThrow(ForbiddenError);
  });

  it('lista apenas os itens da categoria informada', async () => {
    const repo = new InMemoryLibraryItemRepository();
    await repo.create(buildItem());
    await repo.create(buildItem({ id: 'item-2', categoriaId: 'cat-2' }));
    const useCase = new ListLibraryItemsByCategoryUseCase({ libraryItemRepository: repo });

    const result = await useCase.execute(ctx, 'cat-1');

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('item-1');
  });
});

describe('ListAllLibraryItemsUseCase', () => {
  it('exige a permissão libraryItem:read', async () => {
    const repo = new InMemoryLibraryItemRepository();
    const useCase = new ListAllLibraryItemsUseCase({ libraryItemRepository: repo });
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao)).rejects.toThrow(ForbiddenError);
  });

  it('lista todos os itens do tenant, de qualquer categoria', async () => {
    const repo = new InMemoryLibraryItemRepository();
    await repo.create(buildItem());
    await repo.create(buildItem({ id: 'item-2', categoriaId: 'cat-2' }));
    await repo.create(buildItem({ id: 'item-3', tenantId: 'outro-tenant' }));
    const useCase = new ListAllLibraryItemsUseCase({ libraryItemRepository: repo });

    const result = await useCase.execute(ctx);

    expect(result.map((i) => i.id).sort()).toEqual(['item-1', 'item-2']);
  });
});
