import { describe, expect, it } from 'vitest';
import type { FamilyRelationshipFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryFamilyPersonRepository,
  InMemoryFamilyRelationshipRepository,
  InMemoryPersonFraternalRecordRepository,
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
  const personFraternalRecordRepository = new InMemoryPersonFraternalRecordRepository();
  for (const id of managedByLuis) {
    await familyPersonRepository.create(managedFamilyPerson(id, 'luis'));
  }
  const useCase = new CreateFamilyRelationshipUseCase({
    familyRelationshipRepository,
    familyPersonRepository,
    personFraternalRecordRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return {
    useCase,
    familyRelationshipRepository,
    familyPersonRepository,
    personFraternalRecordRepository,
  };
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

  it('registra automaticamente a Fraternidade Feminina pra cônjuge (spouse_of) de Irmão', async () => {
    const { useCase, personFraternalRecordRepository } = await buildUseCase();
    const result = await useCase.execute(
      ctx,
      'luis',
      baseInput({
        fromKind: 'member',
        fromId: 'luis',
        toKind: 'familyPerson',
        toId: 'conjuge-1',
        relationKind: 'spouse_of',
        parentRole: null,
        visibility: 'members',
      }),
    );

    expect(result.ok).toBe(true);
    const records = await personFraternalRecordRepository.listByPerson(
      't1',
      'familyPerson',
      'conjuge-1',
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      affiliationKind: 'female_fraternity',
      visibility: 'members',
      sourceKind: 'lodge_record',
    });
  });

  it('registra automaticamente a Fraternidade Feminina pra companheira (partner_of) de Irmão', async () => {
    const { useCase, personFraternalRecordRepository } = await buildUseCase();
    const result = await useCase.execute(
      ctx,
      'luis',
      baseInput({
        fromKind: 'member',
        fromId: 'luis',
        toKind: 'familyPerson',
        toId: 'companheira-1',
        relationKind: 'partner_of',
        parentRole: null,
      }),
    );

    expect(result.ok).toBe(true);
    const records = await personFraternalRecordRepository.listByPerson(
      't1',
      'familyPerson',
      'companheira-1',
    );
    expect(records).toHaveLength(1);
    expect(records[0]?.affiliationKind).toBe('female_fraternity');
  });

  it('nunca duplica o registro se a pessoa já tem afiliação de Fraternidade Feminina', async () => {
    const { useCase, personFraternalRecordRepository } = await buildUseCase();
    await personFraternalRecordRepository.create({
      id: 'record-existente',
      tenantId: 't1',
      personKind: 'familyPerson',
      personId: 'conjuge-1',
      affiliationKind: 'female_fraternity',
      organizacaoNome: null,
      unidadeTipo: 'fraternity',
      unidadeNome: null,
      unidadeNumero: null,
      cidade: null,
      estado: null,
      pais: null,
      potencia: null,
      rito: null,
      dataIniciacao: null,
      dataElevacao: null,
      dataExaltacao: null,
      grau: null,
      cargos: [],
      titulos: [],
      passouAoOrienteEternoEm: null,
      resumoLegado: null,
      visibility: 'private',
      reviewStatus: 'draft',
      sourceKind: 'self_declaration',
      sourceDescription: null,
      createdAt: new Date('2020-01-01'),
      updatedAt: new Date('2020-01-01'),
      createdBy: 'luis',
      updatedBy: 'luis',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });

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

    const records = await personFraternalRecordRepository.listByPerson(
      't1',
      'familyPerson',
      'conjuge-1',
    );
    expect(records).toHaveLength(1);
    expect(records[0]?.id).toBe('record-existente');
  });

  it('nunca registra Fraternidade Feminina quando os dois lados do vínculo já são Members', async () => {
    const { useCase, personFraternalRecordRepository } = await buildUseCase();
    await useCase.execute(
      ctx,
      'luis',
      baseInput({
        fromKind: 'member',
        fromId: 'luis',
        toKind: 'member',
        toId: 'outra-irma',
        relationKind: 'spouse_of',
        parentRole: null,
      }),
    );

    const records = await personFraternalRecordRepository.listByPerson(
      't1',
      'member',
      'outra-irma',
    );
    expect(records).toHaveLength(0);
  });
});
