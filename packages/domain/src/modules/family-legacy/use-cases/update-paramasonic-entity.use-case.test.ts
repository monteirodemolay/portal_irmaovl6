import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { NotFoundError, ValidationError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryParamasonicEntityRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateParamasonicEntityUseCase } from './create-paramasonic-entity.use-case';
import {
  UpdateParamasonicEntityUseCase,
  type UpdateParamasonicEntityInput,
} from './update-paramasonic-entity.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['paramasonicEntity:manage'],
};

const updateInput: UpdateParamasonicEntityInput = {
  kind: 'jobs_daughters',
  name: 'Bethel Estrela Guardiã',
  shortName: 'Filhas de Jó',
  unitNumber: '42',
  parentUnitName: 'Loja Verdadeira Luz nº 06',
  situacao: 'em_implantacao',
  modules: { people: true, agenda: false, content: false, publicPage: false },
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

  const useCase = new UpdateParamasonicEntityUseCase({
    paramasonicEntityRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
  });
  return { useCase, paramasonicEntityRepository, entityId: created.value.id };
}

describe('UpdateParamasonicEntityUseCase', () => {
  it('atualiza os dados institucionais da entidade', async () => {
    const { useCase, entityId, paramasonicEntityRepository } = await buildScenario();

    const result = await useCase.execute(ctx, entityId, updateInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.kind).toBe('jobs_daughters');
    expect(result.value.situacao).toBe('em_implantacao');
    expect(result.value.unitNumber).toBe('42');
    const stored = await paramasonicEntityRepository.findById(entityId);
    expect(stored?.shortName).toBe('Filhas de Jó');
  });

  it('retorna NotFoundError para entidade inexistente', async () => {
    const { useCase } = await buildScenario();

    const result = await useCase.execute(ctx, 'inexistente', updateInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita nome oficial em branco', async () => {
    const { useCase, entityId } = await buildScenario();

    const result = await useCase.execute(ctx, entityId, { ...updateInput, name: '  ' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });
});
