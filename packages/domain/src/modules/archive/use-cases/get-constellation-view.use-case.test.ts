import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import { InMemoryConstellationViewRepository } from '../../../test/fakes';
import type { ConstellationView } from '../entities/constellation-view.entity';
import { GetConstellationViewUseCase } from './get-constellation-view.use-case';

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

function buildUseCase(views: ConstellationView[]) {
  const repo = new InMemoryConstellationViewRepository();
  for (const view of views) repo.create(view);
  return new GetConstellationViewUseCase({ constellationViewRepository: repo });
}

describe('GetConstellationViewUseCase', () => {
  it('o dono sempre pode abrir', async () => {
    const useCase = buildUseCase([buildView()]);
    const result = await useCase.execute(ownerCtx, 'v1');
    expect(result.ok).toBe(true);
  });

  it('outro Irmão só pode abrir se visibility for shared', async () => {
    const useCase = buildUseCase([buildView({ visibility: 'private' })]);
    const result = await useCase.execute(otherCtx, 'v1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(ForbiddenError);
  });

  it('outro Irmão pode abrir quadro shared', async () => {
    const useCase = buildUseCase([buildView({ visibility: 'shared' })]);
    const result = await useCase.execute(otherCtx, 'v1');
    expect(result.ok).toBe(true);
  });

  it('retorna NotFoundError pra quadro excluído', async () => {
    const useCase = buildUseCase([buildView({ deletedAt: new Date('2026-02-01') })]);
    const result = await useCase.execute(ownerCtx, 'v1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
