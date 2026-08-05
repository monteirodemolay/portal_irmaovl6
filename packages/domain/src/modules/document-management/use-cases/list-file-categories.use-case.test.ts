import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryFileCategoryRepository } from '../../../test/fakes';
import type { FileCategory } from '../entities/file-category.entity';
import { ListFileCategoriesUseCase } from './list-file-categories.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: ['file:read'] };

function buildCategory(overrides: Partial<FileCategory> = {}): FileCategory {
  return {
    id: 'cat-1',
    tenantId: 't1',
    nome: 'Atas',
    acervo: null,
    ordem: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin',
    updatedBy: 'admin',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('ListFileCategoriesUseCase', () => {
  it('lista apenas as categorias do tenant do contexto', async () => {
    const repository = new InMemoryFileCategoryRepository();
    await repository.create(buildCategory({ id: 'cat-1', tenantId: 't1' }));
    await repository.create(buildCategory({ id: 'cat-2', tenantId: 'outro-tenant' }));
    const useCase = new ListFileCategoriesUseCase({ fileCategoryRepository: repository });

    const categories = await useCase.execute(ctx);

    expect(categories.map((c) => c.id)).toEqual(['cat-1']);
  });

  it('retorna lista vazia quando o tenant não possui categorias', async () => {
    const repository = new InMemoryFileCategoryRepository();
    const useCase = new ListFileCategoriesUseCase({ fileCategoryRepository: repository });

    const categories = await useCase.execute(ctx);

    expect(categories).toEqual([]);
  });

  it('lança ForbiddenError quando falta a permissão file:read', async () => {
    const repository = new InMemoryFileCategoryRepository();
    const useCase = new ListFileCategoriesUseCase({ fileCategoryRepository: repository });

    await expect(useCase.execute({ ...ctx, permissions: [] })).rejects.toThrow(ForbiddenError);
  });
});
