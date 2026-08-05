import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryLibraryFavoriteRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { ToggleLibraryFavoriteUseCase } from './toggle-library-favorite.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildUseCase() {
  const favoriteRepository = new InMemoryLibraryFavoriteRepository();
  const useCase = new ToggleLibraryFavoriteUseCase({
    favoriteRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, favoriteRepository };
}

describe('ToggleLibraryFavoriteUseCase', () => {
  it('favorita quando ainda não existe registro', async () => {
    const { useCase, favoriteRepository } = buildUseCase();

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.favorited).toBe(true);
    const registro = await favoriteRepository.findByUserAndItem('u1', 'item-1');
    expect(registro).not.toBeNull();
  });

  it('desfavorita (exclusão física) quando já era favorito', async () => {
    const { useCase, favoriteRepository } = buildUseCase();
    const primeiro = await useCase.execute(ctx, 'item-1');
    if (!primeiro.ok) throw new Error('setup falhou');

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.favorited).toBe(false);
    const registro = await favoriteRepository.findByUserAndItem('u1', 'item-1');
    expect(registro).toBeNull();
  });

  it('alterna de volta para favoritado após desfavoritar', async () => {
    const { useCase, favoriteRepository } = buildUseCase();
    await useCase.execute(ctx, 'item-1');
    await useCase.execute(ctx, 'item-1');

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.favorited).toBe(true);
    const favoritosDoUsuario = await favoriteRepository.listByUser('t1', 'u1');
    expect(favoritosDoUsuario).toHaveLength(1);
  });

  it('não interfere no favorito de outro usuário para o mesmo item', async () => {
    const { useCase } = buildUseCase();
    const outroCtx: AuthContext = { ...ctx, uid: 'outro-uid' };
    await useCase.execute(outroCtx, 'item-1');

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.favorited).toBe(true);
  });
});
