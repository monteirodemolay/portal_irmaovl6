import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryParamasonicEntityRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateParamasonicEntityUseCase } from './create-paramasonic-entity.use-case';
import { GetParamasonicEntityUseCase } from './get-paramasonic-entity.use-case';

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

  const useCase = new GetParamasonicEntityUseCase({ paramasonicEntityRepository });
  return { useCase, entityId: created.value.id };
}

describe('GetParamasonicEntityUseCase', () => {
  it('retorna a entidade quando existe e pertence ao tenant', async () => {
    const { useCase, entityId } = await buildScenario();

    const result = await useCase.execute(ctx, entityId);

    expect(result?.shortName).toBe('DeMolays');
  });

  it('retorna null para entidade inexistente', async () => {
    const { useCase } = await buildScenario();

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result).toBeNull();
  });

  it('lança ForbiddenError quando falta a permissão paramasonicEntity:read', async () => {
    const { useCase, entityId } = await buildScenario();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, entityId)).rejects.toThrow(ForbiddenError);
  });
});
