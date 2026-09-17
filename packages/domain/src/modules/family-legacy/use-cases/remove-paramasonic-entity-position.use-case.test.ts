import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryParamasonicEntityPositionRepository,
  InMemoryParamasonicEntityRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateParamasonicEntityUseCase } from './create-paramasonic-entity.use-case';
import { CreateParamasonicEntityPositionUseCase } from './create-paramasonic-entity-position.use-case';
import { RemoveParamasonicEntityPositionUseCase } from './remove-paramasonic-entity-position.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['paramasonicEntity:manage'],
};

async function buildScenario() {
  const paramasonicEntityRepository = new InMemoryParamasonicEntityRepository();
  const paramasonicEntityPositionRepository = new InMemoryParamasonicEntityPositionRepository();

  const createEntityUseCase = new CreateParamasonicEntityUseCase({
    paramasonicEntityRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  const created = await createEntityUseCase.execute(ctx, {
    kind: 'demolay',
    name: 'Capítulo Guardiões da Vigilância',
    shortName: 'DeMolays',
    unitNumber: null,
    parentUnitName: 'Loja Verdadeira Luz nº 06',
    situacao: 'ativa',
    modules: { people: true, agenda: true, content: true, publicPage: false },
  });
  if (!created.ok) throw new Error('setup failed');

  const createPositionUseCase = new CreateParamasonicEntityPositionUseCase({
    paramasonicEntityPositionRepository,
    paramasonicEntityRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  const position = await createPositionUseCase.execute(ctx, created.value.id, 'Secretaria');
  if (!position.ok) throw new Error('setup failed');

  const useCase = new RemoveParamasonicEntityPositionUseCase({
    paramasonicEntityPositionRepository,
    clock: new FixedClock(new Date('2026-03-01T00:00:00Z')),
  });
  return { useCase, paramasonicEntityPositionRepository, positionId: position.value.id };
}

describe('RemoveParamasonicEntityPositionUseCase', () => {
  it('remove (soft delete) o cargo', async () => {
    const { useCase, paramasonicEntityPositionRepository, positionId } = await buildScenario();

    const result = await useCase.execute(ctx, positionId);

    expect(result.ok).toBe(true);
    const stored = await paramasonicEntityPositionRepository.findById(positionId);
    expect(stored?.deletedAt).not.toBeNull();
  });

  it('retorna NotFoundError para cargo inexistente', async () => {
    const { useCase } = await buildScenario();

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
