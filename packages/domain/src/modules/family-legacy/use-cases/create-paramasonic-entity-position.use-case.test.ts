import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryParamasonicEntityPositionRepository,
  InMemoryParamasonicEntityRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateParamasonicEntityUseCase } from './create-paramasonic-entity.use-case';
import { CreateParamasonicEntityPositionUseCase } from './create-paramasonic-entity-position.use-case';

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

  const useCase = new CreateParamasonicEntityPositionUseCase({
    paramasonicEntityPositionRepository,
    paramasonicEntityRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, paramasonicEntityPositionRepository, entityId: created.value.id };
}

describe('CreateParamasonicEntityPositionUseCase', () => {
  it('cadastra um cargo pra entidade', async () => {
    const { useCase, entityId, paramasonicEntityPositionRepository } = await buildScenario();

    const result = await useCase.execute(ctx, entityId, 'Presidência');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nome).toBe('Presidência');
    const stored = await paramasonicEntityPositionRepository.findById(result.value.id);
    expect(stored).not.toBeNull();
  });

  it('rejeita nome em branco', async () => {
    const { useCase, entityId } = await buildScenario();

    const result = await useCase.execute(ctx, entityId, '   ');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('rejeita cargo duplicado (case-insensitive) na mesma entidade', async () => {
    const { useCase, entityId } = await buildScenario();
    await useCase.execute(ctx, entityId, 'Secretaria');

    const result = await useCase.execute(ctx, entityId, 'secretaria');

    expect(result.ok).toBe(false);
  });

  it('retorna NotFoundError para entidade inexistente', async () => {
    const { useCase } = await buildScenario();

    const result = await useCase.execute(ctx, 'inexistente', 'Tesouraria');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta a permissão paramasonicEntity:manage', async () => {
    const { useCase, entityId } = await buildScenario();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, entityId, 'Tesouraria')).rejects.toThrow(
      ForbiddenError,
    );
  });
});
