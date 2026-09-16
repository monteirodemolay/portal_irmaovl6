import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, ValidationError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryParamasonicEntityRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import {
  CreateParamasonicEntityUseCase,
  type CreateParamasonicEntityInput,
} from './create-paramasonic-entity.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['paramasonicEntity:manage'],
};

const baseInput: CreateParamasonicEntityInput = {
  kind: 'demolay',
  name: 'Capítulo Guardiões da Vigilância',
  shortName: 'DeMolays',
  unitNumber: null,
  parentUnitName: 'Loja Verdadeira Luz nº 06',
  situacao: 'ativa',
  modules: { people: true, agenda: true, content: true, publicPage: false },
};

function buildUseCase() {
  const paramasonicEntityRepository = new InMemoryParamasonicEntityRepository();
  const useCase = new CreateParamasonicEntityUseCase({
    paramasonicEntityRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, paramasonicEntityRepository };
}

describe('CreateParamasonicEntityUseCase', () => {
  it('cadastra uma nova entidade paramaçônica', async () => {
    const { useCase, paramasonicEntityRepository } = buildUseCase();

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.name).toBe('Capítulo Guardiões da Vigilância');
    expect(result.value.managerUserIds).toEqual([]);
    expect(result.value.crestUrl).toBeNull();
    const stored = await paramasonicEntityRepository.findById(result.value.id);
    expect(stored).not.toBeNull();
  });

  it('rejeita nome oficial em branco', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, { ...baseInput, name: '   ' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('rejeita nome curto em branco', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, { ...baseInput, shortName: '' });

    expect(result.ok).toBe(false);
  });

  it('lança ForbiddenError quando falta a permissão paramasonicEntity:manage', async () => {
    const { useCase } = buildUseCase();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, baseInput)).rejects.toThrow(ForbiddenError);
  });
});
