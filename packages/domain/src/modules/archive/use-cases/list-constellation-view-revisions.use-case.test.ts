import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  InMemoryConstellationViewRepository,
  InMemoryConstellationViewRevisionRepository,
} from '../../../test/fakes';
import type { ConstellationView } from '../entities/constellation-view.entity';
import { ListConstellationViewRevisionsUseCase } from './list-constellation-view-revisions.use-case';

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
    version: 2,
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

describe('ListConstellationViewRevisionsUseCase', () => {
  it('lista revisões do mais novo pro mais antigo', async () => {
    const viewRepo = new InMemoryConstellationViewRepository();
    await viewRepo.create(buildView());
    const revisionRepo = new InMemoryConstellationViewRevisionRepository();
    await revisionRepo.create({
      id: 'r1',
      tenantId: 't1',
      viewId: 'v1',
      version: 1,
      nome: 'Quadro',
      descricao: null,
      centerNodeKey: null,
      filters: { kinds: null, from: null, to: null },
      pinnedNodeKeys: [],
      hiddenNodeKeys: [],
      createdAt: new Date('2026-01-01'),
      createdBy: 'member-1',
    });
    await revisionRepo.create({
      id: 'r2',
      tenantId: 't1',
      viewId: 'v1',
      version: 2,
      nome: 'Quadro renomeado',
      descricao: null,
      centerNodeKey: null,
      filters: { kinds: null, from: null, to: null },
      pinnedNodeKeys: [],
      hiddenNodeKeys: [],
      createdAt: new Date('2026-02-01'),
      createdBy: 'member-1',
    });

    const useCase = new ListConstellationViewRevisionsUseCase({
      constellationViewRepository: viewRepo,
      constellationViewRevisionRepository: revisionRepo,
    });
    const result = await useCase.execute(ownerCtx, 'v1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((r) => r.version)).toEqual([2, 1]);
  });

  it('retorna ForbiddenError pra quem não é dono', async () => {
    const viewRepo = new InMemoryConstellationViewRepository();
    await viewRepo.create(buildView());
    const useCase = new ListConstellationViewRevisionsUseCase({
      constellationViewRepository: viewRepo,
      constellationViewRevisionRepository: new InMemoryConstellationViewRevisionRepository(),
    });
    const result = await useCase.execute(otherCtx, 'v1');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(ForbiddenError);
  });
});
