import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryMemberCentralProfileRepository,
  InMemoryMemberRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { MemberCentralProfileValues } from '@vl6/shared';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';
import { UpdateCentralProfileUseCase } from './update-central-profile.use-case';

const ctx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['memberCentral:update'],
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

function buildInput(
  overrides: Partial<MemberCentralProfileValues> = {},
): MemberCentralProfileValues {
  return {
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
    ...overrides,
  };
}

function buildUseCase() {
  const memberCentralProfileRepository = new InMemoryMemberCentralProfileRepository();
  const memberRepository = new InMemoryMemberRepository();
  const clock = new FixedClock(new Date('2026-02-01T00:00:00Z'));
  const idGenerator = new SequentialIdGenerator();
  const useCase = new UpdateCentralProfileUseCase({
    memberCentralProfileRepository,
    memberRepository,
    clock,
    idGenerator,
  });
  return { useCase, memberCentralProfileRepository, memberRepository };
}

describe('UpdateCentralProfileUseCase — status de negócios', () => {
  it('negócio novo nasce pending_review', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute(
      ctx,
      buildInput({
        negocios: [
          {
            id: 'negocio-1',
            nomeEmpresa: 'Nova Empresa',
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
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.negocios[0]).toMatchObject({ status: 'pending_review' });
  });

  it('negócio já publicado, sem alteração de conteúdo, mantém published', async () => {
    const { useCase, memberRepository, memberCentralProfileRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    const published: MemberCentralProfile['negocios'][number] = {
      id: 'negocio-1',
      nomeEmpresa: 'Empresa Publicada',
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
      status: 'published',
      updatedAt: new Date('2026-01-15'),
    };
    await memberCentralProfileRepository.create({
      id: 'profile-1',
      tenantId: 't1',
      memberId: 'member-1',
      apresentacao: 'Antigo',
      interesses: null,
      cidadeExibicao: null,
      areaAtuacao: null,
      areaAtuacaoOutra: null,
      formacao: null,
      resumoProfissional: null,
      negocios: [published],
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
    });

    // Salva de novo (ex.: editou "Sobre"), sem tocar no negócio.
    const result = await useCase.execute(
      ctx,
      buildInput({
        apresentacao: 'Novo texto',
        negocios: [
          {
            id: 'negocio-1',
            nomeEmpresa: 'Empresa Publicada',
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
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.negocios[0]).toMatchObject({
      status: 'published',
      updatedAt: new Date('2026-01-15'),
    });
  });

  it('editar o conteúdo de um negócio publicado volta pra pending_review', async () => {
    const { useCase, memberRepository, memberCentralProfileRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await memberCentralProfileRepository.create({
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
      negocios: [
        {
          id: 'negocio-1',
          nomeEmpresa: 'Nome Antigo',
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
          status: 'published',
          updatedAt: new Date('2026-01-15'),
        },
      ],
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
    });

    const result = await useCase.execute(
      ctx,
      buildInput({
        negocios: [
          {
            id: 'negocio-1',
            nomeEmpresa: 'Nome Novo',
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
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.negocios[0]).toMatchObject({ status: 'pending_review' });
    expect(result.value.negocios[0]?.updatedAt).toEqual(new Date('2026-02-01T00:00:00Z'));
  });
});
