import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  InMemoryMemberCentralProfileRepository,
  InMemoryMemberRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';
import { ListBusinessSubmissionsUseCase } from './list-business-submissions.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['memberCentral:manage'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: 'user-1',
    nomeCompleto: 'Irmão de Teste',
    fotoUrl: null,
    email: 'irmao@vl6.test',
    telefone: '11999999999',
    whatsapp: '11999999999',
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: null,
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'regular',
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

function buildProfile(overrides: Partial<MemberCentralProfile> = {}): MemberCentralProfile {
  return {
    id: 'profile-1',
    tenantId: 't1',
    memberId: 'member-1',
    apresentacao: null,
    interesses: null,
    cidadeExibicao: null,
    areaAtuacao: null,
    areaAtuacaoOutra: null,
    formacao: null,
    resumoProfissional: null,
    negocios: [],
    competencias: [],
    servicos: [],
    lojasVisitadas: null,
    interessesMaconicos: null,
    externalLinks: {
      whatsapp: null,
      instagram: null,
      facebook: null,
      linkedin: null,
      lattes: null,
      site: null,
    },
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

function buildUseCase() {
  const memberCentralProfileRepository = new InMemoryMemberCentralProfileRepository();
  const memberRepository = new InMemoryMemberRepository();
  const useCase = new ListBusinessSubmissionsUseCase({
    memberCentralProfileRepository,
    memberRepository,
  });
  return { useCase, memberCentralProfileRepository, memberRepository };
}

describe('ListBusinessSubmissionsUseCase', () => {
  it('lista só negócios pending_review, mesmo de perfil nunca publicado', async () => {
    const { useCase, memberCentralProfileRepository, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await memberCentralProfileRepository.create(
      buildProfile({
        negocios: [
          {
            id: 'negocio-1',
            nomeEmpresa: 'Pendente',
            segmento: null,
            cargo: null,
            descricao: null,
            cidade: null,
            telefoneComercial: null,
            siteUrl: null,
            status: 'pending_review',
            updatedAt: new Date('2026-01-01'),
          },
          {
            id: 'negocio-2',
            nomeEmpresa: 'Já publicado',
            segmento: null,
            cargo: null,
            descricao: null,
            cidade: null,
            telefoneComercial: null,
            siteUrl: null,
            status: 'published',
            updatedAt: new Date('2026-01-01'),
          },
        ],
      }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]).toMatchObject({
      nomeEmpresa: 'Pendente',
      memberNomeCompleto: 'Irmão de Teste',
    });
  });

  it('devolve vazio quando não há nada pendente', async () => {
    const { useCase, memberCentralProfileRepository, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await memberCentralProfileRepository.create(buildProfile());

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(0);
  });
});
