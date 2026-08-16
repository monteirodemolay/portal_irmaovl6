import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryArchiveRelationRepository } from '../../../test/fakes';
import type { ArchiveRelation } from '../entities/archive-relation.entity';
import { SoftDeleteArchiveRelationUseCase } from './soft-delete-archive-relation.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveRelation:delete'],
};

function makeRelation(overrides: Partial<ArchiveRelation> = {}): ArchiveRelation {
  return {
    id: 'r1',
    tenantId: 't1',
    origemTipo: 'member',
    origemId: 'member-1',
    destinoTipo: 'boardTerm',
    destinoId: 'term-1',
    tipo: 'participou_de',
    descricao: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const archiveRelationRepository = new InMemoryArchiveRelationRepository();
  const useCase = new SoftDeleteArchiveRelationUseCase({
    archiveRelationRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
  });
  return { useCase, archiveRelationRepository };
}

describe('SoftDeleteArchiveRelationUseCase', () => {
  it('marca a relação como removida sem apagar o documento', async () => {
    const { useCase, archiveRelationRepository } = buildUseCase();
    await archiveRelationRepository.create(makeRelation());

    const result = await useCase.execute(ctx, 'r1');

    expect(result.ok).toBe(true);
    const stored = await archiveRelationRepository.findById('r1');
    expect(stored?.deletedAt).toEqual(new Date('2026-02-01T00:00:00Z'));
    expect(stored?.ativo).toBe(false);
  });

  it('retorna NotFoundError para relação inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'ghost');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError sem archiveRelation:delete', async () => {
    const { useCase, archiveRelationRepository } = buildUseCase();
    await archiveRelationRepository.create(makeRelation());

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'r1')).rejects.toThrow(
      ForbiddenError,
    );
  });
});
