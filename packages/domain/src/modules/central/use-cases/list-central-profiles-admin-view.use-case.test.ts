import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  InMemoryMemberRepository,
  InMemoryPublicationSettingsRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { PublicationSettings } from '../entities/publication-settings.entity';
import { ListCentralProfilesAdminViewUseCase } from './list-central-profiles-admin-view.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['memberCentral:manage'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['memberDirectory:read'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'm1',
    tenantId: 't1',
    userId: null,
    nomeCompleto: 'Irmão de Teste',
    fotoUrl: null,
    email: 'teste@example.com',
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: '001',
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'ativo',
    lojaId: 't1',
    potencia: 'GLEG',
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
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
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
    memberId: 'm1',
    profilePublished: false,
    blocks: {
      apresentacao: false,
      informacoesPessoais: false,
      profissional: false,
      empresa: false,
      informacoesMaconicas: false,
      competencias: false,
      servicos: false,
      afiliacoes: false,
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
    createdBy: 'm1',
    updatedBy: 'm1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const memberRepository = new InMemoryMemberRepository();
  const publicationSettingsRepository = new InMemoryPublicationSettingsRepository();
  const useCase = new ListCentralProfilesAdminViewUseCase({
    memberRepository,
    publicationSettingsRepository,
  });
  return { useCase, memberRepository, publicationSettingsRepository };
}

describe('ListCentralProfilesAdminViewUseCase', () => {
  it('lista Irmão sem PublicationSettings como publicado (padrão aberto)', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]).toMatchObject({
      memberId: 'm1',
      profilePublished: true,
      suspendedAt: null,
    });
  });

  it('respeita profilePublished: false explícito do titular', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(buildSettings({ profilePublished: false }));

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value[0]?.profilePublished).toBe(false);
  });

  it('reflete suspensão administrativa mesmo com profilePublished: true', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(
      buildSettings({
        profilePublished: true,
        suspendedAt: new Date('2026-06-01'),
        suspendedReason: 'Denúncia',
      }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value[0]).toMatchObject({
      profilePublished: false,
      suspendedReason: 'Denúncia',
    });
  });

  it('não lista Irmão excluído', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ deletedAt: new Date('2026-01-01') }));

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(0);
  });

  it('lança ForbiddenError sem memberCentral:manage', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute(readOnlyCtx)).rejects.toThrow(ForbiddenError);
  });
});
