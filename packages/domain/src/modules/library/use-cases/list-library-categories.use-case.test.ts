import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryLibraryCategoryRepository } from '../../../test/fakes';
import type { LibraryCategory } from '../entities/library-category.entity';
import { ListLibraryCategoriesUseCase } from './list-library-categories.use-case';

const ctx: AuthContext = {
  uid: 'u1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['libraryItem:read'],
};

function buildCategory(overrides: Partial<LibraryCategory> = {}): LibraryCategory {
  return {
    id: 'cat-1',
    tenantId: 't1',
    nome: 'Rituais',
    categoriaPaiId: null,
    ordem: 0,
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

describe('ListLibraryCategoriesUseCase', () => {
  it('exige a permissão libraryItem:read', async () => {
    const repo = new InMemoryLibraryCategoryRepository();
    const useCase = new ListLibraryCategoriesUseCase({ libraryCategoryRepository: repo });
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao)).rejects.toThrow(ForbiddenError);
  });

  it('lista as categorias do tenant do requisitante', async () => {
    const repo = new InMemoryLibraryCategoryRepository();
    await repo.create(buildCategory());
    await repo.create(buildCategory({ id: 'cat-2', nome: 'Instrução', tenantId: 'outro-tenant' }));
    const useCase = new ListLibraryCategoriesUseCase({ libraryCategoryRepository: repo });

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]?.nome).toBe('Rituais');
  });

  it('retorna lista vazia quando o tenant não possui categorias', async () => {
    const repo = new InMemoryLibraryCategoryRepository();
    const useCase = new ListLibraryCategoriesUseCase({ libraryCategoryRepository: repo });

    const result = await useCase.execute(ctx);

    expect(result).toEqual([]);
  });
});
