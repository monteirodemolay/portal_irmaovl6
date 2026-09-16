import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryFamilyPersonRepository,
  InMemoryFamilyRelationshipRepository,
  InMemoryPersonFraternalRecordRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { FamilyPerson } from '../entities/family-person.entity';
import type { FamilyRelationship } from '../entities/family-relationship.entity';
import { BackfillFraternidadeFemininaUseCase } from './backfill-fraternidade-feminina.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['familyLegacy:manage'],
};

function buildFamilyPerson(overrides: Partial<FamilyPerson> = {}): FamilyPerson {
  return {
    id: 'esposa-1',
    tenantId: 't1',
    linkedMemberId: null,
    nomeCompleto: 'Esposa do Irmão',
    nomeBusca: 'esposa do irmao',
    fotoUrl: null,
    dataNascimento: null,
    dataFalecimento: null,
    lifeStatus: 'living',
    cidade: null,
    estado: null,
    pais: null,
    biografia: null,
    menorDeIdade: false,
    fraternalLinkStatus: 'unknown',
    visibility: 'members',
    reviewStatus: 'draft',
    sourceKind: 'self_declaration',
    sourceDescription: null,
    managedByMemberId: 'member-1',
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'member-1',
    updatedBy: 'member-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildSpouseRelation(overrides: Partial<FamilyRelationship> = {}): FamilyRelationship {
  return {
    id: 'rel-1',
    tenantId: 't1',
    fromKind: 'member',
    fromId: 'member-1',
    toKind: 'familyPerson',
    toId: 'esposa-1',
    relationKind: 'spouse_of',
    parentRole: null,
    childRole: null,
    declaredLabel: null,
    lineageSide: 'unknown',
    confirmationStatus: 'not_required',
    confirmedAt: null,
    confirmedBy: null,
    confirmationNote: null,
    visibility: 'members',
    reviewStatus: 'draft',
    sourceKind: 'self_declaration',
    sourceDescription: null,
    validFrom: null,
    validTo: null,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'member-1',
    updatedBy: 'member-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildDeps() {
  const familyRelationshipRepository = new InMemoryFamilyRelationshipRepository();
  const familyPersonRepository = new InMemoryFamilyPersonRepository();
  const personFraternalRecordRepository = new InMemoryPersonFraternalRecordRepository();
  const useCase = new BackfillFraternidadeFemininaUseCase({
    familyRelationshipRepository,
    familyPersonRepository,
    personFraternalRecordRepository,
    clock: new FixedClock(new Date('2026-09-16')),
    idGenerator: new SequentialIdGenerator(),
  });
  return {
    useCase,
    familyRelationshipRepository,
    familyPersonRepository,
    personFraternalRecordRepository,
  };
}

describe('BackfillFraternidadeFemininaUseCase', () => {
  it('cria o registro de Fraternidade Feminina pra esposa de um vínculo spouse_of antigo', async () => {
    const {
      useCase,
      familyRelationshipRepository,
      familyPersonRepository,
      personFraternalRecordRepository,
    } = buildDeps();
    await familyPersonRepository.create(buildFamilyPerson());
    await familyRelationshipRepository.create(buildSpouseRelation());

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalConjuges).toBe(1);
    expect(result.value.corrigidos).toEqual([
      { familyPersonId: 'esposa-1', nomeCompleto: 'Esposa do Irmão' },
    ]);
    const records = await personFraternalRecordRepository.listByPerson(
      't1',
      'familyPerson',
      'esposa-1',
    );
    expect(records).toHaveLength(1);
    expect(records[0]?.affiliationKind).toBe('female_fraternity');
  });

  it('nunca mexe em quem já tem o registro', async () => {
    const {
      useCase,
      familyRelationshipRepository,
      familyPersonRepository,
      personFraternalRecordRepository,
    } = buildDeps();
    await familyPersonRepository.create(buildFamilyPerson());
    await familyRelationshipRepository.create(buildSpouseRelation());
    await personFraternalRecordRepository.create({
      id: 'record-existente',
      tenantId: 't1',
      personKind: 'familyPerson',
      personId: 'esposa-1',
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
      createdAt: new Date('2019-01-01'),
      updatedAt: new Date('2019-01-01'),
      createdBy: 'member-1',
      updatedBy: 'member-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.corrigidos).toHaveLength(0);
  });

  it('ignora vínculos onde os dois lados já são Members', async () => {
    const { useCase, familyRelationshipRepository } = buildDeps();
    await familyRelationshipRepository.create(
      buildSpouseRelation({ toKind: 'member', toId: 'member-2' }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.totalConjuges).toBe(0);
  });

  it('lança ForbiddenError sem a permissão familyLegacy:manage', async () => {
    const { useCase } = buildDeps();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao)).rejects.toThrow(ForbiddenError);
  });
});
