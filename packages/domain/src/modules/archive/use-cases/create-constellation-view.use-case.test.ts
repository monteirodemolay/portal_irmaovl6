import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryConstellationViewRepository,
  InMemoryConstellationViewRevisionRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateConstellationViewUseCase } from './create-constellation-view.use-case';

const ctx: AuthContext = {
  uid: 'member-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveRelation:read'],
};

const noPermCtx: AuthContext = { ...ctx, uid: 'member-2', permissions: [] };

const input = {
  nome: 'Minha família na Loja',
  descricao: null,
  centerNodeKey: 'member:member-1',
  filters: { kinds: null, from: null, to: null },
  pinnedNodeKeys: [],
  hiddenNodeKeys: [],
  visibility: 'private' as const,
};

function buildUseCase() {
  const constellationViewRepository = new InMemoryConstellationViewRepository();
  const constellationViewRevisionRepository = new InMemoryConstellationViewRevisionRepository();
  const useCase = new CreateConstellationViewUseCase({
    constellationViewRepository,
    constellationViewRevisionRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, constellationViewRepository, constellationViewRevisionRepository };
}

describe('CreateConstellationViewUseCase', () => {
  it('cria o quadro com version 1 e uma primeira revisão', async () => {
    const { useCase, constellationViewRepository, constellationViewRevisionRepository } =
      buildUseCase();

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.version).toBe(1);
    expect(result.value.ownerId).toBe('member-1');

    const stored = await constellationViewRepository.findById(result.value.id);
    expect(stored).not.toBeNull();

    const revisions = await constellationViewRevisionRepository.listByView('t1', result.value.id);
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.version).toBe(1);
  });

  it('lança ForbiddenError sem archiveRelation:read', async () => {
    const { useCase } = buildUseCase();
    await expect(useCase.execute(noPermCtx, input)).rejects.toThrow(ForbiddenError);
  });
});
