import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryLinkFavoriteRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { ToggleLinkFavoriteUseCase } from './toggle-link-favorite.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildUseCase() {
  const favoriteRepository = new InMemoryLinkFavoriteRepository();
  const useCase = new ToggleLinkFavoriteUseCase({
    favoriteRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, favoriteRepository };
}

describe('ToggleLinkFavoriteUseCase', () => {
  it('favorita quando ainda não era favorito', async () => {
    const { useCase, favoriteRepository } = buildUseCase();

    const result = await useCase.execute(ctx, 'link-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.favorited).toBe(true);
    expect(await favoriteRepository.listByUser('t1', 'u1')).toHaveLength(1);
  });

  it('desfavorita quando já era favorito', async () => {
    const { useCase, favoriteRepository } = buildUseCase();
    await useCase.execute(ctx, 'link-1');

    const result = await useCase.execute(ctx, 'link-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.favorited).toBe(false);
    expect(await favoriteRepository.listByUser('t1', 'u1')).toHaveLength(0);
  });

  it('não interfere no favorito de outro usuário para o mesmo link', async () => {
    const { useCase, favoriteRepository } = buildUseCase();
    await useCase.execute(ctx, 'link-1');

    await useCase.execute({ ...ctx, uid: 'u2' }, 'link-1');

    expect(await favoriteRepository.listByUser('t1', 'u1')).toHaveLength(1);
    expect(await favoriteRepository.listByUser('t1', 'u2')).toHaveLength(1);
  });
});
