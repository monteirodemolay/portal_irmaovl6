import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryParamasonicEntityRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateParamasonicEntityUseCase } from './create-paramasonic-entity.use-case';
import { SoftDeleteParamasonicEntityUseCase } from './soft-delete-paramasonic-entity.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['paramasonicEntity:manage'],
};

async function buildScenario() {
  const paramasonicEntityRepository = new InMemoryParamasonicEntityRepository();
  const createUseCase = new CreateParamasonicEntityUseCase({
    paramasonicEntityRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  const created = await createUseCase.execute(ctx, {
    kind: 'demolay',
    name: 'Capítulo Guardiões da Vigilância',
    shortName: 'DeMolays',
    unitNumber: null,
    parentUnitName: 'Loja Verdadeira Luz nº 06',
    situacao: 'ativa',
    modules: { people: true, agenda: true, content: true, publicPage: false },
  });
  if (!created.ok) throw new Error('setup failed');

  const useCase = new SoftDeleteParamasonicEntityUseCase({
    paramasonicEntityRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
  });
  return { useCase, paramasonicEntityRepository, entityId: created.value.id };
}

describe('SoftDeleteParamasonicEntityUseCase', () => {
  it('remove (soft delete) a entidade', async () => {
    const { useCase, paramasonicEntityRepository, entityId } = await buildScenario();

    const result = await useCase.execute(ctx, entityId);

    expect(result.ok).toBe(true);
    const stored = await paramasonicEntityRepository.findById(entityId);
    expect(stored?.deletedAt).not.toBeNull();
    expect(stored?.ativo).toBe(false);
  });

  it('retorna NotFoundError para entidade inexistente', async () => {
    const { useCase } = await buildScenario();

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('retorna NotFoundError ao remover a mesma entidade duas vezes', async () => {
    const { useCase, entityId } = await buildScenario();
    await useCase.execute(ctx, entityId);

    const result = await useCase.execute(ctx, entityId);

    expect(result.ok).toBe(false);
  });
});
