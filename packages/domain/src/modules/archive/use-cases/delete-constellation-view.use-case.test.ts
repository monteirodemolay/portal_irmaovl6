import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryConstellationViewRepository } from '../../../test/fakes';
import type { ConstellationView } from '../entities/constellation-view.entity';
import { DeleteConstellationViewUseCase } from './delete-constellation-view.use-case';

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
  const useCase = new DeleteConstellationViewUseCase({
    constellationViewRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
  });
  return { useCase, constellationViewRepository };
}

describe('DeleteConstellationViewUseCase', () => {
  it('faz soft delete quando o dono pede', async () => {
    const { useCase, constellationViewRepository } = buildUseCase([buildView()]);

    const result = await useCase.execute(ownerCtx, 'v1');

    expect(result.ok).toBe(true);
    const stored = await constellationViewRepository.findById('v1');
    expect(stored?.deletedAt).not.toBeNull();
    expect(stored?.ativo).toBe(false);
  });

  it('retorna ForbiddenError pra quem não é dono', async () => {
    const { useCase } = buildUseCase([buildView()]);
    const result = await useCase.execute(otherCtx, 'v1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(ForbiddenError);
  });
});
