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
import { SearchDirectoryUseCase } from './search-directory.use-case';

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
    situacao: 'regular',
    lojaId: 't1',
    potencia: 'GOB',
    profissao: 'Advogado',
    empresa: 'Carvalho & Advogados',
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
    cidadeExibicao: 'Rio Verde - GO',
    areaAtuacao: 'direito',
    areaAtuacaoOutra: null,
    formacao: null,
    resumoProfissional: null,
    negocios: [],
    competencias: ['Direito Civil'],
    servicos: ['Consultoria jurídica'],
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

function buildSettings(overrides: Partial<PublicationSettings> = {}): PublicationSettings {
  return {
    id: 'settings-1',
    tenantId: 't1',
    memberId: 'member-1',
    profilePublished: true,
    blocks: {
      apresentacao: false,
      informacoesPessoais: true,
      profissional: true,
      empresa: false,
      informacoesMaconicas: false,
      competencias: true,
      servicos: true,
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

async function seedPublished(
  memberRepository: InMemoryMemberRepository,
  profileRepository: InMemoryMemberCentralProfileRepository,
  settingsRepository: InMemoryPublicationSettingsRepository,
  overrides: {
    member?: Partial<Member>;
    profile?: Partial<MemberCentralProfile>;
    settings?: Partial<PublicationSettings>;
  } = {},
) {
  await memberRepository.create(buildMember(overrides.member));
  await profileRepository.create(buildProfile(overrides.profile));
  await settingsRepository.create(buildSettings(overrides.settings));
}

function buildUseCase() {
  const memberRepository = new InMemoryMemberRepository();
  const memberCentralProfileRepository = new InMemoryMemberCentralProfileRepository();
  const publicationSettingsRepository = new InMemoryPublicationSettingsRepository();
  const useCase = new SearchDirectoryUseCase({
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

describe('SearchDirectoryUseCase', () => {
  it('filtra por profissão só sobre o DTO já publicado', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await seedPublished(
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    );

    const result = await useCase.execute(ctx, { profissao: 'advogado' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
  });

  it('não vaza profissão de quem tem o bloco profissional desligado', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await seedPublished(
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
      {
        settings: { blocks: { ...buildSettings().blocks, profissional: false } },
      },
    );

    const result = await useCase.execute(ctx, { termo: 'advogado' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(0);
  });

  it('filtra por área de atuação (chave exata)', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await seedPublished(
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    );

    const encontra = await useCase.execute(ctx, { areaAtuacao: 'direito' });
    expect(encontra.ok && encontra.value.items).toHaveLength(1);

    const naoEncontra = await useCase.execute(ctx, { areaAtuacao: 'engenharia' });
    expect(naoEncontra.ok && naoEncontra.value.items).toHaveLength(0);
  });

  it('filtra por competência exata (case-insensitive)', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await seedPublished(
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    );

    const result = await useCase.execute(ctx, { competencia: 'direito civil' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
  });

  it('metrics e areaFacets refletem o total, mesmo com filtro ativo', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await seedPublished(
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    );
    await seedPublished(
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
      {
        member: { id: 'member-2', nomeCompleto: 'Outro Irmão', profissao: 'Engenheiro' },
        profile: {
          id: 'profile-2',
          memberId: 'member-2',
          areaAtuacao: 'engenharia',
          competencias: [],
        },
        settings: { id: 'settings-2', memberId: 'member-2' },
      },
    );

    const result = await useCase.execute(ctx, { areaAtuacao: 'direito' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1); // filtrado
    expect(result.value.metrics.totalIrmaos).toBe(2); // total, não filtrado
    expect(result.value.areaFacets).toEqual(
      expect.arrayContaining([
        { key: 'direito', label: 'Direito', count: 1 },
        { key: 'engenharia', label: 'Engenharia', count: 1 },
      ]),
    );
  });

  it('lança ForbiddenError sem memberDirectory:read', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(ctxSemPermissao)).rejects.toThrow('Permissão ausente');
  });
});
