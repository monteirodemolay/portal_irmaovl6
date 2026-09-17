import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryParamasonicEntityPositionRepository,
  InMemoryParamasonicEntityRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateParamasonicEntityUseCase } from './create-paramasonic-entity.use-case';
import { CreateParamasonicEntityPositionUseCase } from './create-paramasonic-entity-position.use-case';
import { ListParamasonicEntityPositionsUseCase } from './list-paramasonic-entity-positions.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['paramasonicEntity:manage'],
};

const readCtx: AuthContext = { ...ctx, permissions: ['paramasonicEntity:read'] };

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
  await createPositionUseCase.execute(ctx, created.value.id, 'Secretaria');
  await createPositionUseCase.execute(ctx, created.value.id, 'Presidência');

  const useCase = new ListParamasonicEntityPositionsUseCase({
    paramasonicEntityPositionRepository,
  });
  return { useCase, entityId: created.value.id };
}

describe('ListParamasonicEntityPositionsUseCase', () => {
  it('lista os cargos em ordem alfabética', async () => {
    const { useCase, entityId } = await buildScenario();

    const result = await useCase.execute(readCtx, entityId);

    expect(result.map((p) => p.nome)).toEqual(['Presidência', 'Secretaria']);
  });

  it('lança ForbiddenError quando falta a permissão paramasonicEntity:read', async () => {
    const { useCase, entityId } = await buildScenario();
    const semPermissao: AuthContext = { ...readCtx, permissions: [] };

    await expect(useCase.execute(semPermissao, entityId)).rejects.toThrow(ForbiddenError);
  });
});
