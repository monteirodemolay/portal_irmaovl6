import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryConstellationViewRepository,
  InMemoryConstellationViewRevisionRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { ConstellationView } from '../entities/constellation-view.entity';
import { UpdateConstellationViewUseCase } from './update-constellation-view.use-case';

const ownerCtx: AuthContext = {
  uid: 'member-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveRelation:read'],
};
const otherCtx: AuthContext = { ...ownerCtx, uid: 'member-2' };

function buildView(overrides: Partial<ConstellationView> = {}): ConstellationView {
  return {
    id: 'v1',
    tenantId: 't1',
    ownerId: 'member-1',
    nome: 'Original',
    descricao: null,
    centerNodeKey: null,
    filters: { kinds: null, from: null, to: null },
    pinnedNodeKeys: [],
    hiddenNodeKeys: [],
    visibility: 'private',
    version: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'member-1',
    updatedBy: 'member-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase(views: ConstellationView[]) {
  const constellationViewRepository = new InMemoryConstellationViewRepository();
  for (const view of views) constellationViewRepository.create(view);
  const constellationViewRevisionRepository = new InMemoryConstellationViewRevisionRepository();
  const useCase = new UpdateConstellationViewUseCase({
    constellationViewRepository,
    constellationViewRevisionRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, constellationViewRepository, constellationViewRevisionRepository };
}

const input = {
  nome: 'Renomeado',
  descricao: 'Nova descrição',
  centerNodeKey: 'event:e1',
  filters: { kinds: null, from: null, to: null },
  pinnedNodeKeys: ['member:member-1'],
  hiddenNodeKeys: [],
  visibility: 'shared' as const,
};

describe('UpdateConstellationViewUseCase', () => {
  it('incrementa version e grava uma nova revisão', async () => {
    const { useCase, constellationViewRepository, constellationViewRevisionRepository } =
      buildUseCase([buildView()]);

    const result = await useCase.execute(ownerCtx, 'v1', input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.version).toBe(2);
    expect(result.value.nome).toBe('Renomeado');

    const stored = await constellationViewRepository.findById('v1');
    expect(stored?.version).toBe(2);

    const revisions = await constellationViewRevisionRepository.listByView('t1', 'v1');
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.version).toBe(2);
  });

  it('retorna ForbiddenError pra quem não é dono', async () => {
    const { useCase } = buildUseCase([buildView()]);
    const result = await useCase.execute(otherCtx, 'v1', input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(ForbiddenError);
  });

  it('lança ForbiddenError sem archiveRelation:read', async () => {
    const { useCase } = buildUseCase([buildView()]);
    await expect(useCase.execute({ ...ownerCtx, permissions: [] }, 'v1', input)).rejects.toThrow(
      ForbiddenError,
    );
  });
});
