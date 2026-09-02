import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryConstellationViewRepository } from '../../../test/fakes';
import type { ConstellationView } from '../entities/constellation-view.entity';
import { ListMyConstellationViewsUseCase } from './list-my-constellation-views.use-case';

const ctx: AuthContext = {
  uid: 'member-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveRelation:read'],
};

function buildView(overrides: Partial<ConstellationView> = {}): ConstellationView {
  return {
    id: 'v1',
    tenantId: 't1',
    ownerId: 'member-1',
    nome: 'Quadro',
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

describe('ListMyConstellationViewsUseCase', () => {
  it('lista só os quadros do próprio dono, excluindo os excluídos', async () => {
    const repo = new InMemoryConstellationViewRepository();
    await repo.create(buildView({ id: 'v1', updatedAt: new Date('2026-01-01') }));
    await repo.create(buildView({ id: 'v2', updatedAt: new Date('2026-02-01') }));
    await repo.create(buildView({ id: 'v3', ownerId: 'member-2' }));
    await repo.create(buildView({ id: 'v4', deletedAt: new Date('2026-03-01') }));

    const useCase = new ListMyConstellationViewsUseCase({ constellationViewRepository: repo });
    const result = await useCase.execute(ctx);

    expect(result.map((v) => v.id)).toEqual(['v2', 'v1']);
  });
});
