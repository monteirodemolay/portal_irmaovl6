import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryMemberCentralProfileRepository,
  InMemoryMemberRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';
import { MigrateMemberEmpresaToNegociosUseCase } from './migrate-member-empresa-to-negocios.use-case';

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
  const clock = new FixedClock(new Date('2026-03-01T00:00:00Z'));
  const idGenerator = new SequentialIdGenerator();
  const useCase = new MigrateMemberEmpresaToNegociosUseCase({
    memberRepository,
    memberCentralProfileRepository,
    clock,
    idGenerator,
  });
  return { useCase, memberRepository, memberCentralProfileRepository };
}

describe('MigrateMemberEmpresaToNegociosUseCase', () => {
  it('cria um negócio privado (nao_divulgado) quando o Irmão não tinha perfil central', async () => {
    const { useCase, memberRepository, memberCentralProfileRepository } = buildUseCase();
    await memberRepository.create(buildMember({ empresa: 'Prefeitura Municipal de Rio Verde' }));

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([
      {
        memberId: 'member-1',
        nomeCompleto: 'Irmão de Teste',
        empresaMigrada: 'Prefeitura Municipal de Rio Verde',
        acao: 'criado',
      },
    ]);

    const profile = await memberCentralProfileRepository.findByMemberId('t1', 'member-1');
    expect(profile?.negocios).toEqual([
      expect.objectContaining({
        nomeEmpresa: 'Prefeitura Municipal de Rio Verde',
        divulgar: false,
        principal: true,
        status: 'nao_divulgado',
      }),
    ]);
  });

  it('adiciona ao perfil já existente, preservando negócios anteriores', async () => {
    const { useCase, memberRepository, memberCentralProfileRepository } = buildUseCase();
    await memberRepository.create(buildMember({ empresa: 'Prefeitura Municipal' }));
    await memberCentralProfileRepository.create(
      buildProfile({
        negocios: [
          {
            id: 'negocio-existente',
            nomeEmpresa: 'Consultoria Jurídica',
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
            divulgar: true,
            status: 'published',
            updatedAt: new Date('2026-01-15'),
          },
        ],
      }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value[0]?.acao).toBe('criado');

    const profile = await memberCentralProfileRepository.findByMemberId('t1', 'member-1');
    expect(profile?.negocios).toHaveLength(2);
    // Já havia um negócio — o novo não vira Principal sozinho.
    expect(profile?.negocios.find((n) => n.nomeEmpresa === 'Prefeitura Municipal')?.principal).toBe(
      false,
    );
  });

  it('pula quando já existe um negócio com o mesmo nome (normalizado)', async () => {
    const { useCase, memberRepository, memberCentralProfileRepository } = buildUseCase();
    await memberRepository.create(buildMember({ empresa: 'Prefeitura Municipal' }));
    await memberCentralProfileRepository.create(
      buildProfile({
        negocios: [
          {
            id: 'negocio-existente',
            nomeEmpresa: 'prefeitura municipal',
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
            updatedAt: new Date('2026-01-15'),
          },
        ],
      }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([
      {
        memberId: 'member-1',
        nomeCompleto: 'Irmão de Teste',
        empresaMigrada: 'Prefeitura Municipal',
        acao: 'ja_existia_negocio_com_mesmo_nome',
      },
    ]);
    const profile = await memberCentralProfileRepository.findByMemberId('t1', 'member-1');
    expect(profile?.negocios).toHaveLength(1);
  });

  it('não cria nada quando o Irmão não tem empresa preenchida', async () => {
    const { useCase, memberRepository, memberCentralProfileRepository } = buildUseCase();
    await memberRepository.create(buildMember({ empresa: null }));

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([
      {
        memberId: 'member-1',
        nomeCompleto: 'Irmão de Teste',
        empresaMigrada: null,
        acao: 'sem_empresa_preenchida',
      },
    ]);
    expect(await memberCentralProfileRepository.findByMemberId('t1', 'member-1')).toBeNull();
  });

  it('rodar duas vezes é idempotente — não duplica', async () => {
    const { useCase, memberRepository, memberCentralProfileRepository } = buildUseCase();
    await memberRepository.create(buildMember({ empresa: 'Prefeitura Municipal' }));

    await useCase.execute(ctx);
    const second = await useCase.execute(ctx);

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value[0]?.acao).toBe('ja_existia_negocio_com_mesmo_nome');
    const profile = await memberCentralProfileRepository.findByMemberId('t1', 'member-1');
    expect(profile?.negocios).toHaveLength(1);
  });
});
