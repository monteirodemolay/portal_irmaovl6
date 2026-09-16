import { describe, expect, it } from 'vitest';
import {
  InMemoryFamilyPersonRepository,
  InMemoryFamilyRelationshipRepository,
  InMemoryMemberRepository,
  InMemoryPersonFraternalRecordRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { FamilyPerson } from '../../family-legacy/entities/family-person.entity';
import type { FamilyRelationship } from '../../family-legacy/entities/family-relationship.entity';
import type { PersonFraternalRecord } from '../../family-legacy/entities/person-fraternal-record.entity';
import { buildPublicFamiliaLegado } from './build-public-familia-legado';

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: 'user-1',
    nomeCompleto: 'Irmão Titular',
    fotoUrl: null,
    email: null,
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: null,
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'ativo',
    lojaId: 't1',
    potencia: 'GOB',
    profissao: null,
    empresa: null,
    estadoCivil: null,
    conjugeNome: null,
    conjugeDataNascimento: null,
    conjugeAniversarioDia: null,
    conjugeAniversarioMes: null,
    filhos: [],
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    autorizaDivulgacaoExterna: false,
    dataFalecimento: null,
    mensagemHomenagem: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'user-1',
    updatedBy: 'user-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildFamilyPerson(overrides: Partial<FamilyPerson> = {}): FamilyPerson {
  return {
    id: 'pai-1',
    tenantId: 't1',
    linkedMemberId: null,
    nomeCompleto: 'Pai do Irmão',
    nomeBusca: 'pai do irmao',
    fotoUrl: null,
    dataNascimento: new Date('1960-06-15'),
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
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'member-1',
    updatedBy: 'member-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildParentOfRelation(overrides: Partial<FamilyRelationship> = {}): FamilyRelationship {
  return {
    id: 'rel-1',
    tenantId: 't1',
    fromKind: 'familyPerson',
    fromId: 'pai-1',
    toKind: 'member',
    toId: 'member-1',
    relationKind: 'parent_of',
    parentRole: 'pai',
    childRole: null,
    declaredLabel: null,
    lineageSide: 'paternal',
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
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'member-1',
    updatedBy: 'member-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildFraternalRecord(overrides: Partial<PersonFraternalRecord> = {}): PersonFraternalRecord {
  return {
    id: 'record-1',
    tenantId: 't1',
    personKind: 'familyPerson',
    personId: 'pai-1',
    affiliationKind: 'mason',
    organizacaoNome: null,
    unidadeTipo: 'lodge',
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
    visibility: 'members',
    reviewStatus: 'draft',
    sourceKind: 'self_declaration',
    sourceDescription: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'member-1',
    updatedBy: 'member-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildDeps() {
  const memberRepository = new InMemoryMemberRepository();
  const familyPersonRepository = new InMemoryFamilyPersonRepository();
  const familyRelationshipRepository = new InMemoryFamilyRelationshipRepository();
  const personFraternalRecordRepository = new InMemoryPersonFraternalRecordRepository();
  return {
    deps: {
      memberRepository,
      familyPersonRepository,
      familyRelationshipRepository,
      personFraternalRecordRepository,
    },
    memberRepository,
    familyPersonRepository,
    familyRelationshipRepository,
    personFraternalRecordRepository,
  };
}

describe('buildPublicFamiliaLegado', () => {
  it('traz a data de nascimento e marca como Maçom quando há registro de afiliação "mason" visível', async () => {
    const { deps, memberRepository, familyPersonRepository, familyRelationshipRepository, personFraternalRecordRepository } =
      buildDeps();
    await memberRepository.create(buildMember());
    await familyPersonRepository.create(buildFamilyPerson());
    await familyRelationshipRepository.create(buildParentOfRelation());
    await personFraternalRecordRepository.create(buildFraternalRecord());

    const result = await buildPublicFamiliaLegado(deps, 't1', 'member-1');

    expect(result).not.toBeNull();
    const allItems = Object.values(result ?? {}).flat();
    const pai = allItems.find((item) => item.id === 'pai-1');
    expect(pai).toBeDefined();
    expect(pai?.dataNascimento).toEqual(new Date('1960-06-15'));
    expect(pai?.isMacom).toBe(true);
  });

  it('não marca como Maçom quando não há registro de afiliação "mason" visível', async () => {
    const { deps, memberRepository, familyPersonRepository, familyRelationshipRepository } = buildDeps();
    await memberRepository.create(buildMember());
    await familyPersonRepository.create(buildFamilyPerson());
    await familyRelationshipRepository.create(buildParentOfRelation());
    // sem criar nenhum PersonFraternalRecord

    const result = await buildPublicFamiliaLegado(deps, 't1', 'member-1');

    const allItems = Object.values(result ?? {}).flat();
    const pai = allItems.find((item) => item.id === 'pai-1');
    expect(pai?.isMacom).toBe(false);
  });

  it('não considera Maçom um vínculo paramaçônico que não seja "mason" (ex.: DeMolay)', async () => {
    const { deps, memberRepository, familyPersonRepository, familyRelationshipRepository, personFraternalRecordRepository } =
      buildDeps();
    await memberRepository.create(buildMember());
    await familyPersonRepository.create(buildFamilyPerson());
    await familyRelationshipRepository.create(buildParentOfRelation());
    await personFraternalRecordRepository.create(
      buildFraternalRecord({ affiliationKind: 'demolay' }),
    );

    const result = await buildPublicFamiliaLegado(deps, 't1', 'member-1');

    const allItems = Object.values(result ?? {}).flat();
    const pai = allItems.find((item) => item.id === 'pai-1');
    expect(pai?.isMacom).toBe(false);
  });

  it('um familiar cadastrado como Membro (kind === "member") é sempre Maçom, mas nunca expõe dataNascimento', async () => {
    const { deps, memberRepository, familyRelationshipRepository } = buildDeps();
    await memberRepository.create(buildMember());
    await memberRepository.create(
      buildMember({ id: 'member-2', nomeCompleto: 'Filho Também Irmão' }),
    );
    await familyRelationshipRepository.create(
      buildParentOfRelation({
        id: 'rel-2',
        fromKind: 'member',
        fromId: 'member-1',
        toKind: 'member',
        toId: 'member-2',
      }),
    );

    const result = await buildPublicFamiliaLegado(deps, 't1', 'member-1');

    const allItems = Object.values(result ?? {}).flat();
    const filho = allItems.find((item) => item.id === 'member-2');
    expect(filho?.kind).toBe('member');
    expect(filho?.isMacom).toBe(true);
    expect(filho?.dataNascimento).toBeNull();
  });

  it('não inclui um familiar visível fora de members/archive, mesmo com registro de afiliação', async () => {
    const { deps, memberRepository, familyPersonRepository, familyRelationshipRepository } =
      buildDeps();
    await memberRepository.create(buildMember());
    await familyPersonRepository.create(buildFamilyPerson({ visibility: 'private' }));
    await familyRelationshipRepository.create(buildParentOfRelation());

    const result = await buildPublicFamiliaLegado(deps, 't1', 'member-1');

    expect(result).toBeNull();
  });
});
