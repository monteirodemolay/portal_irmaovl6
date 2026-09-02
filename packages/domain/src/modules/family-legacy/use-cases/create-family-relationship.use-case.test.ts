import { describe, expect, it } from 'vitest';
import type { FamilyRelationshipFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryFamilyPersonRepository,
  InMemoryFamilyRelationshipRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { FamilyPerson } from '../entities/family-person.entity';
import { CreateFamilyRelationshipUseCase } from './create-family-relationship.use-case';

const ctx: AuthContext = { uid: 'user-1', tenantId: 't1', roleId: 'r1', permissions: [] };

function baseInput(
  overrides: Partial<FamilyRelationshipFormValues> = {},
): FamilyRelationshipFormValues {
  return {
    fromKind: 'familyPerson',
    fromId: 'mae-1',
    toKind: 'member',
    toId: 'luis',
    relationKind: 'parent_of',
    parentRole: 'mae',
    childRole: null,
    declaredLabel: null,
    visibility: 'private',
    sourceKind: 'self_declaration',
    sourceDescription: null,
    ...overrides,
  };
}

function managedFamilyPerson(id: string, managedByMemberId: string): FamilyPerson {
  return {
    id,
    tenantId: 't1',
    linkedMemberId: null,
    nomeCompleto: `Familiar ${id}`,
    nomeBusca: `familiar ${id}`,
    fotoUrl: null,
    dataNascimento: null,
    dataFalecimento: null,
    lifeStatus: 'unknown',
    cidade: null,
    estado: null,
    pais: null,
    biografia: null,
    menorDeIdade: false,
    fraternalLinkStatus: 'unknown',
    visibility: 'private',
    reviewStatus: 'draft',
    sourceKind: 'self_declaration',
    sourceDescription: null,
    managedByMemberId,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    createdBy: managedByMemberId,
    updatedBy: managedByMemberId,
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
}

async function buildUseCase(managedByLuis: string[] = ['mae-1']) {
  const familyRelationshipRepository = new InMemoryFamilyRelationshipRepository();
  const familyPersonRepository = new InMemoryFamilyPersonRepository();
  for (const id of managedByLuis) {
    await familyPersonRepository.create(managedFamilyPerson(id, 'luis'));
  }
  const useCase = new CreateFamilyRelationshipUseCase({
    familyRelationshipRepository,
    familyPersonRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, familyRelationshipRepository, familyPersonRepository };
}

describe('CreateFamilyRelationshipUseCase', () => {
  it('cria o vínculo quando o Irmão é parte de uma das pontas', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute(ctx, 'luis', baseInput());
    expect(result.ok).toBe(true);
  });

  it('impede autorrelação', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute(
      ctx,
      'luis',
      baseInput({ fromKind: 'member', fromId: 'luis', toKind: 'member', toId: 'luis' }),
    );
    expect(result.ok).toBe(false);
  });

  it('impede escrita quando o Irmão não é parte de nenhuma ponta', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute(ctx, 'outro-membro', baseInput());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('forbidden');
  });

  it('impede duplicidade simétrica (cônjuge já registrado, tentando de novo em ordem invertida)', async () => {
    const { useCase } = await buildUseCase();
    await useCase.execute(
      ctx,
      'luis',
      baseInput({
        fromKind: 'member',
        fromId: 'luis',
        toKind: 'familyPerson',
        toId: 'conjuge-1',
        relationKind: 'spouse_of',
        parentRole: null,
      }),
    );

    const inverted = await useCase.execute(
      ctx,
      'luis',
      baseInput({
        fromKind: 'familyPerson',
        fromId: 'conjuge-1',
        toKind: 'member',
        toId: 'luis',
        relationKind: 'spouse_of',
        parentRole: null,
      }),
    );

    expect(inverted.ok).toBe(false);
    if (inverted.ok) return;
    expect(inverted.error.code).toBe('conflict');
  });

  it('impede ciclo de ascendência', async () => {
    const { useCase } = await buildUseCase(['pai-1', 'avo-1']);
    // avô -> pai -> luis já registrados
    await useCase.execute(
      ctx,
      'luis',
      baseInput({
        fromKind: 'familyPerson',
        fromId: 'pai-1',
        toKind: 'member',
        toId: 'luis',
        relationKind: 'parent_of',
        parentRole: 'pai',
      }),
    );
    await useCase.execute(
      ctx,
      'luis',
      baseInput({
        fromKind: 'familyPerson',
        fromId: 'avo-1',
        toKind: 'familyPerson',
        toId: 'pai-1',
        relationKind: 'parent_of',
        parentRole: 'pai',
      }),
    );

    // Tentar declarar luis como pai do avô fecharia o ciclo.
    const cyclic = await useCase.execute(
      ctx,
      'luis',
      baseInput({
        fromKind: 'member',
        fromId: 'luis',
        toKind: 'familyPerson',
        toId: 'avo-1',
        relationKind: 'parent_of',
        parentRole: null,
      }),
    );

    expect(cyclic.ok).toBe(false);
    if (cyclic.ok) return;
    expect(cyclic.error.code).toBe('conflict');
  });

  it('exige confirmação entre Members', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute(
      ctx,
      'luis',
      baseInput({ fromKind: 'member', fromId: 'luis', toKind: 'member', toId: 'outro-irmao' }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.confirmationStatus).toBe('pending');
  });

  it('permite pessoa histórica sem confirmação', async () => {
    const { useCase } = await buildUseCase();
    const result = await useCase.execute(ctx, 'luis', baseInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.confirmationStatus).toBe('not_required');
  });
});
