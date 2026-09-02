import { describe, expect, it } from 'vitest';
import type { PersonFraternalRecordFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryFamilyPersonRepository,
  InMemoryPersonFraternalRecordRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { FamilyPerson } from '../entities/family-person.entity';
import { CreatePersonFraternalRecordUseCase } from './create-person-fraternal-record.use-case';

const ctx: AuthContext = { uid: 'user-1', tenantId: 't1', roleId: 'r1', permissions: [] };

function baseFamilyPerson(): FamilyPerson {
  return {
    id: 'person-1',
    tenantId: 't1',
    linkedMemberId: null,
    nomeCompleto: 'Ana Souza',
    nomeBusca: 'ana souza',
    fotoUrl: null,
    dataNascimento: null,
    dataFalecimento: null,
    lifeStatus: 'living',
    cidade: null,
    estado: null,
    pais: null,
    biografia: null,
    menorDeIdade: false,
    fraternalLinkStatus: 'has_affiliation',
    visibility: 'private',
    reviewStatus: 'draft',
    sourceKind: 'self_declaration',
    sourceDescription: null,
    managedByMemberId: 'luis',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    createdBy: 'luis',
    updatedBy: 'luis',
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
}

function demolayInput(
  overrides: Partial<PersonFraternalRecordFormValues> = {},
): PersonFraternalRecordFormValues {
  return {
    personKind: 'familyPerson',
    personId: 'person-1',
    affiliationKind: 'demolay',
    organizacaoNome: null,
    unidadeTipo: 'chapter',
    unidadeNome: 'Capítulo Estrela do Vale',
    unidadeNumero: '42',
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
    sourceKind: 'self_declaration',
    sourceDescription: null,
    reviewStatus: 'draft',
    ...overrides,
  };
}

function buildUseCase() {
  const personFraternalRecordRepository = new InMemoryPersonFraternalRecordRepository();
  const familyPersonRepository = new InMemoryFamilyPersonRepository();
  const useCase = new CreatePersonFraternalRecordUseCase({
    personFraternalRecordRepository,
    familyPersonRepository,
    clock: new FixedClock(),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, personFraternalRecordRepository, familyPersonRepository };
}

describe('CreatePersonFraternalRecordUseCase', () => {
  it('registra DeMolay em Capítulo', async () => {
    const { useCase, familyPersonRepository } = buildUseCase();
    await familyPersonRepository.create(baseFamilyPerson());

    const result = await useCase.execute(ctx, 'luis', demolayInput());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.affiliationKind).toBe('demolay');
    expect(result.value.unidadeTipo).toBe('chapter');
  });

  it('registra Filha de Jó em Bethel', async () => {
    const { useCase, familyPersonRepository } = buildUseCase();
    await familyPersonRepository.create(baseFamilyPerson());

    const result = await useCase.execute(
      ctx,
      'luis',
      demolayInput({
        affiliationKind: 'jobs_daughters',
        unidadeTipo: 'bethel',
        unidadeNome: 'Bethel 7',
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.affiliationKind).toBe('jobs_daughters');
    expect(result.value.unidadeTipo).toBe('bethel');
  });

  it('permite mais de uma afiliação para a mesma pessoa', async () => {
    const { useCase, familyPersonRepository, personFraternalRecordRepository } = buildUseCase();
    await familyPersonRepository.create(baseFamilyPerson());

    await useCase.execute(ctx, 'luis', demolayInput());
    await useCase.execute(
      ctx,
      'luis',
      demolayInput({
        affiliationKind: 'mason',
        unidadeTipo: 'lodge',
        unidadeNome: 'Loja Vale Luminoso',
      }),
    );

    const records = await personFraternalRecordRepository.listByPerson(
      't1',
      'familyPerson',
      'person-1',
    );
    expect(records).toHaveLength(2);
  });

  it('rejeita quem não gerencia a FamilyPerson', async () => {
    const { useCase, familyPersonRepository } = buildUseCase();
    await familyPersonRepository.create(baseFamilyPerson());

    const result = await useCase.execute(ctx, 'outro-membro', demolayInput());
    expect(result.ok).toBe(false);
  });
});
