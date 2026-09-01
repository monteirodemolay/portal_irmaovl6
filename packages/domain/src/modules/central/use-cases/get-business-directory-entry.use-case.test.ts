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
import { GetBusinessDirectoryEntryUseCase } from './get-business-directory-entry.use-case';

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
      memoriaFotografica: false,
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

function buildNegocio(overrides: Partial<MemberCentralProfile['negocios'][number]> = {}) {
  return {
    id: 'negocio-1',
    nomeEmpresa: 'Consultoria VL6',
    segmento: 'Consultoria',
    cargo: null,
    descricao: null,
    cidade: 'Rio Verde',
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
    status: 'published' as const,
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function buildUseCase() {
  const memberRepository = new InMemoryMemberRepository();
  const memberCentralProfileRepository = new InMemoryMemberCentralProfileRepository();
  const publicationSettingsRepository = new InMemoryPublicationSettingsRepository();
  const useCase = new GetBusinessDirectoryEntryUseCase({
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

describe('GetBusinessDirectoryEntryUseCase', () => {
  it('retorna a empresa publicada pelo businessId', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(buildSettings());
    await memberCentralProfileRepository.create(
      buildProfile({ negocios: [buildNegocio({ id: 'negocio-1', nomeEmpresa: 'Achada' })] }),
    );

    const result = await useCase.execute(ctx, 'negocio-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.nomeEmpresa).toBe('Achada');
  });

  it('retorna null para businessId inexistente', async () => {
    const { useCase } = buildUseCase();
    const result = await useCase.execute(ctx, 'nao-existe');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it('retorna null para negócio não publicado (bloco empresa desligado)', async () => {
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
      buildProfile({ negocios: [buildNegocio({ id: 'negocio-1' })] }),
    );

    const result = await useCase.execute(ctx, 'negocio-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it('retorna null para negócio de outro tenant', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await memberRepository.create(buildMember({ tenantId: 't2' }));
    await publicationSettingsRepository.create(buildSettings({ tenantId: 't2' }));
    await memberCentralProfileRepository.create(
      buildProfile({ tenantId: 't2', negocios: [buildNegocio({ id: 'negocio-1' })] }),
    );

    const result = await useCase.execute(ctx, 'negocio-1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });
});
