import { describe, expect, it } from 'vitest';
import type { ArchiveRelationFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveRelationRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateArchiveRelationUseCase } from './create-archive-relation.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveRelation:create'],
};

const input: ArchiveRelationFormValues = {
  origemTipo: 'member',
  origemId: 'member-1',
  destinoTipo: 'boardTerm',
  destinoId: 'term-1',
  tipo: 'participou_de',
  descricao: null,
};

function buildUseCase() {
  const archiveRelationRepository = new InMemoryArchiveRelationRepository();
  const useCase = new CreateArchiveRelationUseCase({
    archiveRelationRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, archiveRelationRepository };
}

describe('CreateArchiveRelationUseCase', () => {
  it('cria a relação referenciando os dois nós pelo ID canônico', async () => {
    const { useCase, archiveRelationRepository } = buildUseCase();

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.origemId).toBe('member-1');
    expect(result.value.destinoId).toBe('term-1');
    expect(result.value.tenantId).toBe('t1');

    const stored = await archiveRelationRepository.findById(result.value.id);
    expect(stored).not.toBeNull();
  });

  it('lança ForbiddenError quando falta a permissão archiveRelation:create', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ ...ctx, permissions: [] }, input)).rejects.toThrow(
      ForbiddenError,
    );
  });
});
