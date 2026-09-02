import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryConstellationViewRepository,
  InMemoryConstellationViewRevisionRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { ConstellationView } from '../entities/constellation-view.entity';
import { RestoreConstellationViewRevisionUseCase } from './restore-constellation-view-revision.use-case';

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
    nome: 'Atual',
    descricao: null,
    centerNodeKey: null,
    filters: { kinds: null, from: null, to: null },
    pinnedNodeKeys: [],
    hiddenNodeKeys: [],
    visibility: 'private',
    version: 2,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-02-01'),
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
  constellationViewRevisionRepository.create({
    id: 'r1',
    tenantId: 't1',
    viewId: 'v1',
    version: 1,
    nome: 'Versão antiga',
    descricao: null,
    centerNodeKey: 'member:member-1',
    filters: { kinds: null, from: null, to: null },
    pinnedNodeKeys: [],
    hiddenNodeKeys: [],
    createdAt: new Date('2026-01-01'),
    createdBy: 'member-1',
  });
  const useCase = new RestoreConstellationViewRevisionUseCase({
    constellationViewRepository,
    constellationViewRevisionRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, constellationViewRepository, constellationViewRevisionRepository };
}

describe('RestoreConstellationViewRevisionUseCase', () => {
  it('aplica a revisão antiga como nova versão, sem apagar histórico', async () => {
    const { useCase, constellationViewRepository, constellationViewRevisionRepository } =
      buildUseCase([buildView()]);

    const result = await useCase.execute(ownerCtx, 'v1', 'r1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nome).toBe('Versão antiga');
    expect(result.value.version).toBe(3);

    const stored = await constellationViewRepository.findById('v1');
    expect(stored?.nome).toBe('Versão antiga');

    const revisions = await constellationViewRevisionRepository.listByView('t1', 'v1');
    expect(revisions).toHaveLength(2);
    expect(revisions.map((r) => r.version).sort()).toEqual([1, 3]);
  });

  it('retorna ForbiddenError pra quem não é dono', async () => {
    const { useCase } = buildUseCase([buildView()]);
    const result = await useCase.execute(otherCtx, 'v1', 'r1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(ForbiddenError);
  });

  it('retorna NotFoundError pra revisão inexistente', async () => {
    const { useCase } = buildUseCase([buildView()]);
    const result = await useCase.execute(ownerCtx, 'v1', 'missing');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
