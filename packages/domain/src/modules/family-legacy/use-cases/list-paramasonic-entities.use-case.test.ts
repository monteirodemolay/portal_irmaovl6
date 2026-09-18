import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryParamasonicEntityRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateParamasonicEntityUseCase } from './create-paramasonic-entity.use-case';
import { ListParamasonicEntitiesUseCase } from './list-paramasonic-entities.use-case';

const adminCtx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['paramasonicEntity:manage'],
};

const readCtx: AuthContext = {
  ...adminCtx,
  uid: 'member-1',
  permissions: ['paramasonicEntity:read'],
};

async function buildScenario() {
  const paramasonicEntityRepository = new InMemoryParamasonicEntityRepository();
  const createUseCase = new CreateParamasonicEntityUseCase({
    paramasonicEntityRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  await createUseCase.execute(adminCtx, {
    kind: 'jobs_daughters',
    name: 'Bethel Estrela Guardiã',
    shortName: 'Filhas de Jó',
    unitNumber: null,
    parentUnitName: 'Loja Verdadeira Luz nº 06',
    situacao: 'ativa',
    modules: { people: true, agenda: true, content: true, publicPage: false },
  });
  await createUseCase.execute(adminCtx, {
    kind: 'demolay',
    name: 'Capítulo Guardiões da Vigilância',
    shortName: 'DeMolays',
    unitNumber: null,
    parentUnitName: 'Loja Verdadeira Luz nº 06',
    situacao: 'ativa',
    modules: { people: true, agenda: true, content: true, publicPage: false },
  });

  const useCase = new ListParamasonicEntitiesUseCase({ paramasonicEntityRepository });
  return { useCase };
}

describe('ListParamasonicEntitiesUseCase', () => {
  it('lista as entidades do tenant ordenadas por nome curto', async () => {
    const { useCase } = await buildScenario();

    const result = await useCase.execute(readCtx);

    expect(result.map((e) => e.shortName)).toEqual(['DeMolays', 'Filhas de Jó']);
  });

  it('lança ForbiddenError quando falta a permissão paramasonicEntity:read', async () => {
    const { useCase } = await buildScenario();
    const semPermissao: AuthContext = { ...readCtx, permissions: [] };

    await expect(useCase.execute(semPermissao)).rejects.toThrow(ForbiddenError);
  });
});
