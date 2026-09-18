import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryMemberRepository,
  InMemoryParamasonicEntityMemberRepository,
  InMemoryParamasonicEntityRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { AddParamasonicEntityMemberUseCase } from './add-paramasonic-entity-member.use-case';
import { CreateParamasonicEntityUseCase } from './create-paramasonic-entity.use-case';
import { RemoveParamasonicEntityMemberUseCase } from './remove-paramasonic-entity-member.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['paramasonicEntity:manage'],
};

async function buildScenario() {
  const paramasonicEntityRepository = new InMemoryParamasonicEntityRepository();
  const paramasonicEntityMemberRepository = new InMemoryParamasonicEntityMemberRepository();
  const memberRepository = new InMemoryMemberRepository();

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

  const addUseCase = new AddParamasonicEntityMemberUseCase({
    paramasonicEntityMemberRepository,
    paramasonicEntityRepository,
    memberRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  const added = await addUseCase.execute(ctx, {
    entityId: created.value.id,
    memberId: null,
    nomeCompleto: 'Zeca Souza',
    contato: null,
    cargo: null,
    situacao: 'ativo',
    dataIngresso: null,
  });
  if (!added.ok) throw new Error('setup failed');

  const useCase = new RemoveParamasonicEntityMemberUseCase({
    paramasonicEntityMemberRepository,
    clock: new FixedClock(new Date('2026-03-01T00:00:00Z')),
  });
  return { useCase, paramasonicEntityMemberRepository, memberEntryId: added.value.id };
}

describe('RemoveParamasonicEntityMemberUseCase', () => {
  it('remove (soft delete) o integrante', async () => {
    const { useCase, paramasonicEntityMemberRepository, memberEntryId } = await buildScenario();

    const result = await useCase.execute(ctx, memberEntryId);

    expect(result.ok).toBe(true);
    const stored = await paramasonicEntityMemberRepository.findById(memberEntryId);
    expect(stored?.deletedAt).not.toBeNull();
  });

  it('retorna NotFoundError para integrante inexistente', async () => {
    const { useCase } = await buildScenario();

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
