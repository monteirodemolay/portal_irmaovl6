import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryLibraryFavoriteRepository } from '../../../test/fakes';
import type { LibraryFavorite } from '../entities/library-favorite.entity';
import { ListMyFavoritesUseCase } from './list-my-favorites.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildFavorite(overrides: Partial<LibraryFavorite> = {}): LibraryFavorite {
  return {
    id: 'fav-1',
    tenantId: 't1',
    userId: 'u1',
    libraryItemId: 'item-1',
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

describe('ListMyFavoritesUseCase', () => {
  it('não exige permissão de RBAC — é uma ação pessoal', async () => {
    const repo = new InMemoryLibraryFavoriteRepository();
    const useCase = new ListMyFavoritesUseCase({ favoriteRepository: repo });

    const result = await useCase.execute(ctx);

    expect(result).toEqual([]);
  });

  it('lista apenas os favoritos do próprio usuário', async () => {
    const repo = new InMemoryLibraryFavoriteRepository();
    await repo.create(buildFavorite());
    await repo.create(buildFavorite({ id: 'fav-2', userId: 'outro-uid', libraryItemId: 'item-2' }));
    const useCase = new ListMyFavoritesUseCase({ favoriteRepository: repo });

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]?.libraryItemId).toBe('item-1');
  });

  it('retorna lista vazia quando o usuário não tem favoritos', async () => {
    const repo = new InMemoryLibraryFavoriteRepository();
    await repo.create(buildFavorite({ userId: 'outro-uid' }));
    const useCase = new ListMyFavoritesUseCase({ favoriteRepository: repo });

    const result = await useCase.execute(ctx);

    expect(result).toEqual([]);
  });
});
