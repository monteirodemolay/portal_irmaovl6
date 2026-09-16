import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  InMemoryFamilyPersonRepository,
  InMemoryMemberRepository,
  InMemoryPersonFraternalRecordRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { FamilyPerson } from '../entities/family-person.entity';
import type { PersonFraternalRecord } from '../entities/person-fraternal-record.entity';
import { ListParamasonicDirectoryUseCase } from './list-paramasonic-directory.use-case';

const ctx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['familyLegacy:read'],
};

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
    fraternalLinkStatus: 'has_affiliation',
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

function buildFraternalRecord(
  overrides: Partial<PersonFraternalRecord> = {},
): PersonFraternalRecord {
  return {
    id: 'record-1',
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
    visibility: 'members',
    reviewStatus: 'draft',
    sourceKind: 'lodge_record',
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
  const personFraternalRecordRepository = new InMemoryPersonFraternalRecordRepository();
  const familyPersonRepository = new InMemoryFamilyPersonRepository();
  const memberRepository = new InMemoryMemberRepository();
  const useCase = new ListParamasonicDirectoryUseCase({
    personFraternalRecordRepository,
    familyPersonRepository,
    memberRepository,
  });
  return { useCase, personFraternalRecordRepository, familyPersonRepository, memberRepository };
}

describe('ListParamasonicDirectoryUseCase', () => {
  it('traz um familiar com afiliação visível publicamente', async () => {
    const { useCase, personFraternalRecordRepository, familyPersonRepository } = buildDeps();
    await familyPersonRepository.create(buildFamilyPerson());
    await personFraternalRecordRepository.create(buildFraternalRecord());

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      personKind: 'familyPerson',
      personId: 'esposa-1',
      nomeCompleto: 'Esposa do Irmão',
      affiliationKind: 'female_fraternity',
    });
  });

  it('nunca inclui affiliationKind "mason" (isso é o Diretório de Irmãos)', async () => {
    const { useCase, personFraternalRecordRepository, familyPersonRepository } = buildDeps();
    await familyPersonRepository.create(buildFamilyPerson());
    await personFraternalRecordRepository.create(
      buildFraternalRecord({ affiliationKind: 'mason' }),
    );

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(0);
  });

  it('nunca inclui um registro com visibilidade privada', async () => {
    const { useCase, personFraternalRecordRepository, familyPersonRepository } = buildDeps();
    await familyPersonRepository.create(buildFamilyPerson());
    await personFraternalRecordRepository.create(buildFraternalRecord({ visibility: 'private' }));

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(0);
  });

  it('nunca inclui quando o cadastro da FamilyPerson em si é privado, mesmo com o registro de afiliação visível', async () => {
    const { useCase, personFraternalRecordRepository, familyPersonRepository } = buildDeps();
    await familyPersonRepository.create(buildFamilyPerson({ visibility: 'private' }));
    await personFraternalRecordRepository.create(buildFraternalRecord());

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(0);
  });

  it('traz um Member com afiliação paramaçônica (ex.: DeMolay antes de virar Irmão)', async () => {
    const { useCase, personFraternalRecordRepository, memberRepository } = buildDeps();
    await memberRepository.create(buildMember());
    await personFraternalRecordRepository.create(
      buildFraternalRecord({
        id: 'record-2',
        personKind: 'member',
        personId: 'member-1',
        affiliationKind: 'demolay',
      }),
    );

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      personKind: 'member',
      personId: 'member-1',
      nomeCompleto: 'Irmão Titular',
      affiliationKind: 'demolay',
    });
  });

  it('lança ForbiddenError sem a permissão familyLegacy:read', async () => {
    const { useCase } = buildDeps();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao)).rejects.toThrow(ForbiddenError);
  });
});
