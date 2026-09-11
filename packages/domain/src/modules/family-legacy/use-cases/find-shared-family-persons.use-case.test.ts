import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  InMemoryFamilyPersonRepository,
  InMemoryFamilyRelationshipRepository,
  InMemoryMemberRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { FamilyPerson } from '../entities/family-person.entity';
import type { FamilyRelationship } from '../entities/family-relationship.entity';
import { FindSharedFamilyPersonsUseCase } from './find-shared-family-persons.use-case';

const ctx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['familyLegacy:read'],
};

function buildMember(id: string, nomeCompleto: string): Member {
  return {
    id,
    tenantId: 't1',
    userId: `user-${id}`,
    nomeCompleto,
    fotoUrl: null,
    email: `${id}@vl6.test`,
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
  };
}

function buildFamilyPerson(
  id: string,
  nomeCompleto: string,
  managedByMemberId: string,
): FamilyPerson {
  return {
    id,
    tenantId: 't1',
    linkedMemberId: null,
    nomeCompleto,
    nomeBusca: nomeCompleto.toLowerCase(),
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
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: managedByMemberId,
    updatedBy: managedByMemberId,
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
}

function buildParentOfRelation(
  id: string,
  fromKind: 'member' | 'familyPerson',
  fromId: string,
  toKind: 'member' | 'familyPerson',
  toId: string,
  visibility: FamilyRelationship['visibility'] = 'private',
): FamilyRelationship {
  return {
    id,
    tenantId: 't1',
    fromKind,
    fromId,
    toKind,
    toId,
    relationKind: 'parent_of',
    parentRole: 'pai',
    childRole: null,
    declaredLabel: null,
    lineageSide: 'paternal',
    confirmationStatus: 'not_required',
    confirmedAt: null,
    confirmedBy: null,
    confirmationNote: null,
    visibility,
    reviewStatus: 'draft',
    sourceKind: 'self_declaration',
    sourceDescription: null,
    validFrom: null,
    validTo: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: fromKind === 'member' ? fromId : 'someone',
    updatedBy: fromKind === 'member' ? fromId : 'someone',
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
}

function buildUseCase() {
  const familyRelationshipRepository = new InMemoryFamilyRelationshipRepository();
  const familyPersonRepository = new InMemoryFamilyPersonRepository();
  const memberRepository = new InMemoryMemberRepository();
  const useCase = new FindSharedFamilyPersonsUseCase({
    familyRelationshipRepository,
    familyPersonRepository,
    memberRepository,
  });
  return { useCase, familyRelationshipRepository, familyPersonRepository, memberRepository };
}

describe('FindSharedFamilyPersonsUseCase', () => {
  it('encontra parentesco cruzado quando dois Irmãos compartilham o mesmo FamilyPerson', async () => {
    const { useCase, familyRelationshipRepository, familyPersonRepository, memberRepository } =
      buildUseCase();

    await memberRepository.create(buildMember('member-a', 'Irmão A'));
    await memberRepository.create(buildMember('member-b', 'Irmão B'));
    await familyPersonRepository.create(
      buildFamilyPerson('pai-1', 'Eduardo Rodrigues Lima', 'member-a'),
    );
    await familyPersonRepository.create(buildFamilyPerson('avo-1', 'Rosulino Campos', 'member-a'));

    // avô -> pai -> Irmão A (2 saltos: A chama avô de "Avô ou avó")
    await familyRelationshipRepository.create(
      buildParentOfRelation('r1', 'familyPerson', 'avo-1', 'familyPerson', 'pai-1'),
    );
    await familyRelationshipRepository.create(
      buildParentOfRelation('r2', 'familyPerson', 'pai-1', 'member', 'member-a'),
    );
    // avô -> Irmão B diretamente (visível — revela o parentesco de B também)
    await familyRelationshipRepository.create(
      buildParentOfRelation('r3', 'familyPerson', 'avo-1', 'member', 'member-b', 'members'),
    );

    const result = await useCase.execute(ctx, 'member-a');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([
      {
        familyPersonId: 'avo-1',
        familyPersonNome: 'Rosulino Campos',
        sharedWithMemberId: 'member-b',
        sharedWithNome: 'Irmão B',
        parentescoDoTitular: 'Avô ou avó paterno(a)',
        parentescoDoOutroIrmao: 'Filho ou filha',
      },
    ]);
  });

  it('não revela o parentesco do outro Irmão quando o vínculo dele é privado', async () => {
    const { useCase, familyRelationshipRepository, familyPersonRepository, memberRepository } =
      buildUseCase();

    await memberRepository.create(buildMember('member-a', 'Irmão A'));
    await memberRepository.create(buildMember('member-b', 'Irmão B'));
    await familyPersonRepository.create(buildFamilyPerson('avo-1', 'Rosulino Campos', 'member-a'));

    await familyRelationshipRepository.create(
      buildParentOfRelation('r1', 'familyPerson', 'avo-1', 'member', 'member-a'),
    );
    // Vínculo de B com o mesmo avô, mas privado.
    await familyRelationshipRepository.create(
      buildParentOfRelation('r2', 'familyPerson', 'avo-1', 'member', 'member-b', 'private'),
    );

    const result = await useCase.execute(ctx, 'member-a');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([
      expect.objectContaining({
        sharedWithMemberId: 'member-b',
        parentescoDoOutroIrmao: null,
      }),
    ]);
  });

  it('devolve lista vazia quando nenhum FamilyPerson é compartilhado', async () => {
    const { useCase, familyRelationshipRepository, familyPersonRepository, memberRepository } =
      buildUseCase();

    await memberRepository.create(buildMember('member-a', 'Irmão A'));
    await familyPersonRepository.create(
      buildFamilyPerson('pai-1', 'Eduardo Rodrigues Lima', 'member-a'),
    );
    await familyRelationshipRepository.create(
      buildParentOfRelation('r1', 'familyPerson', 'pai-1', 'member', 'member-a'),
    );

    const result = await useCase.execute(ctx, 'member-a');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([]);
  });

  it('devolve lista vazia quando o titular não tem nenhum familiar cadastrado', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember('member-a', 'Irmão A'));

    const result = await useCase.execute(ctx, 'member-a');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([]);
  });
});
