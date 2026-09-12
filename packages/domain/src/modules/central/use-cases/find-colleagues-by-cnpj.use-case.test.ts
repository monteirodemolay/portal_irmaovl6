import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  InMemoryMemberCentralProfileRepository,
  InMemoryMemberRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type {
  CentralBusinessEntry,
  MemberCentralProfile,
} from '../entities/member-central-profile.entity';
import { FindColleaguesByCnpjUseCase } from './find-colleagues-by-cnpj.use-case';

const ctx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['memberDirectory:read'],
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
    ...overrides,
  };
}

function buildNegocio(overrides: Partial<CentralBusinessEntry> = {}): CentralBusinessEntry {
  return {
    id: 'negocio-1',
    nomeEmpresa: 'Prefeitura Municipal',
    segmento: null,
    cargo: null,
    descricao: null,
    cidade: null,
    telefoneComercial: null,
    siteUrl: null,
    cnpj: null,
    logoUrl: null,
    produtosServicos: [],
    whatsappComercial: null,
    emailComercial: null,
    instagramComercial: null,
    formasAtendimento: [],
    horarioFuncionamento: null,
    ofereceDescontoIrmaos: false,
    descontoDescricao: null,
    status: 'nao_divulgado',
    updatedAt: new Date('2026-01-01'),
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
    especializacao: null,
    especializacaoOutra: null,
    formacao: null,
    resumoProfissional: null,
    negocios: [],
    competencias: [],
    servicos: [],
    afiliacoes: [],
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
  const memberRepository = new InMemoryMemberRepository();
  const memberCentralProfileRepository = new InMemoryMemberCentralProfileRepository();
  const useCase = new FindColleaguesByCnpjUseCase({
    memberRepository,
    memberCentralProfileRepository,
  });
  return { useCase, memberRepository, memberCentralProfileRepository };
}

describe('FindColleaguesByCnpjUseCase', () => {
  it('encontra colegas com o mesmo CNPJ, excluindo o próprio Irmão', async () => {
    const { useCase, memberRepository, memberCentralProfileRepository } = buildUseCase();
    await memberRepository.create(buildMember({ id: 'member-1', nomeCompleto: 'Eu Mesmo' }));
    await memberRepository.create(buildMember({ id: 'member-2', nomeCompleto: 'Colega' }));
    await memberCentralProfileRepository.create(
      buildProfile({
        memberId: 'member-1',
        negocios: [buildNegocio({ id: 'n1', cnpj: '02056729000105' })],
      }),
    );
    await memberCentralProfileRepository.create(
      buildProfile({
        id: 'profile-2',
        memberId: 'member-2',
        negocios: [buildNegocio({ id: 'n2', cnpj: '02056729000105', cargo: 'Analista' })],
      }),
    );

    const result = await useCase.execute(ctx, '02.056.729/0001-05', 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([
      { memberId: 'member-2', nomeCompleto: 'Colega', fotoUrl: null, cargo: 'Analista' },
    ]);
  });

  it('ignora perfis sem negócio com aquele CNPJ', async () => {
    const { useCase, memberRepository, memberCentralProfileRepository } = buildUseCase();
    await memberRepository.create(buildMember({ id: 'member-1' }));
    await memberRepository.create(buildMember({ id: 'member-2', nomeCompleto: 'Outro' }));
    await memberCentralProfileRepository.create(
      buildProfile({
        id: 'profile-2',
        memberId: 'member-2',
        negocios: [buildNegocio({ id: 'n2', cnpj: '11111111000191' })],
      }),
    );

    const result = await useCase.execute(ctx, '02056729000105', 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([]);
  });

  it('funciona independente de divulgar/status — colegas é institucional, não editorial', async () => {
    const { useCase, memberRepository, memberCentralProfileRepository } = buildUseCase();
    await memberRepository.create(buildMember({ id: 'member-1' }));
    await memberRepository.create(buildMember({ id: 'member-2', nomeCompleto: 'Colega Privado' }));
    await memberCentralProfileRepository.create(
      buildProfile({
        id: 'profile-2',
        memberId: 'member-2',
        negocios: [
          buildNegocio({
            id: 'n2',
            cnpj: '02056729000105',
            divulgar: false,
            status: 'nao_divulgado',
          }),
        ],
      }),
    );

    const result = await useCase.execute(ctx, '02056729000105', 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
  });

  it('CNPJ inválido (diferente de 14 dígitos) devolve lista vazia sem erro', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ id: 'member-1' }));

    const result = await useCase.execute(ctx, '123', 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([]);
  });
});
