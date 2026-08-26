import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  InMemoryMemberCentralProfileRepository,
  InMemoryMemberRepository,
  InMemoryPublicationSettingsRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';
import type { PublicationSettings } from '../entities/publication-settings.entity';
import { SearchBusinessDirectoryUseCase } from './search-business-directory.use-case';

const ctx: AuthContext = {
  uid: 'viewer-1',
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

function buildSettings(overrides: Partial<PublicationSettings> = {}): PublicationSettings {
  return {
    id: 'settings-1',
    tenantId: 't1',
    memberId: 'member-1',
    profilePublished: true,
    blocks: {
      apresentacao: false,
      informacoesPessoais: false,
      profissional: false,
      empresa: true,
      informacoesMaconicas: false,
      competencias: false,
      servicos: false,
      endereco: false,
    },
    contacts: { telefone: false, whatsapp: false, email: false },
    externalLinks: {
      whatsapp: false,
      instagram: false,
      facebook: false,
      linkedin: false,
      lattes: false,
      site: false,
    },
    suspendedAt: null,
    suspendedBy: null,
    suspendedReason: null,
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
  const memberRepository = new InMemoryMemberRepository();
  const memberCentralProfileRepository = new InMemoryMemberCentralProfileRepository();
  const publicationSettingsRepository = new InMemoryPublicationSettingsRepository();
  const useCase = new SearchBusinessDirectoryUseCase({
    memberRepository,
    memberCentralProfileRepository,
    publicationSettingsRepository,
  });
  return {
    useCase,
    memberRepository,
    memberCentralProfileRepository,
    publicationSettingsRepository,
  };
}

describe('SearchBusinessDirectoryUseCase', () => {
  it('achata negocios[] de todos os perfis publicados num card por empresa', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(buildSettings());
    await memberCentralProfileRepository.create(
      buildProfile({
        negocios: [
          {
            id: 'negocio-1',
            nomeEmpresa: 'Gestão Pública & Projetos',
            segmento: 'Consultoria',
            cargo: 'Sócio',
            descricao: 'Licitações e contratos',
            cidade: 'Rio Verde',
            telefoneComercial: null,
            siteUrl: null,
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
            updatedAt: new Date('2026-01-01'),
          },
        ],
      }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0]).toMatchObject({
      nomeEmpresa: 'Gestão Pública & Projetos',
      responsavel: { memberId: 'member-1', nomeCompleto: 'Irmão de Teste' },
    });
  });

  it('nunca inclui negócio de perfil com bloco "empresa" desligado', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(
      buildSettings({ blocks: { ...buildSettings().blocks, empresa: false } }),
    );
    await memberCentralProfileRepository.create(
      buildProfile({
        negocios: [
          {
            id: 'negocio-1',
            nomeEmpresa: 'Empresa Oculta',
            segmento: null,
            cargo: null,
            descricao: null,
            cidade: null,
            telefoneComercial: null,
            siteUrl: null,
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
            updatedAt: new Date('2026-01-01'),
          },
        ],
      }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(0);
  });

  it('filtra por segmento e cidade', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(buildSettings());
    await memberCentralProfileRepository.create(
      buildProfile({
        negocios: [
          {
            id: 'negocio-1',
            nomeEmpresa: 'Engenharia & Campo',
            segmento: 'Agronegócio',
            cargo: null,
            descricao: null,
            cidade: 'Rio Verde',
            telefoneComercial: null,
            siteUrl: null,
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
            updatedAt: new Date('2026-01-01'),
          },
        ],
      }),
    );

    const bySegmento = await useCase.execute(ctx, { segmento: 'agro' });
    expect(bySegmento.ok && bySegmento.value.items).toHaveLength(1);

    const byCidadeSemMatch = await useCase.execute(ctx, { cidade: 'Goiânia' });
    expect(byCidadeSemMatch.ok && byCidadeSemMatch.value.items).toHaveLength(0);
  });
});
