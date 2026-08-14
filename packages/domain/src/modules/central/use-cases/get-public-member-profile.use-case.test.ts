import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  InMemoryMemberCentralProfileRepository,
  InMemoryMemberRepository,
  InMemoryPublicationSettingsRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { PublicationSettings } from '../entities/publication-settings.entity';
import { GetPublicMemberProfileUseCase } from './get-public-member-profile.use-case';

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
      apresentacao: true,
      informacoesPessoais: false,
      profissional: false,
      empresa: false,
      informacoesMaconicas: false,
      competencias: false,
      servicos: false,
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

function buildUseCase() {
  const memberRepository = new InMemoryMemberRepository();
  const memberCentralProfileRepository = new InMemoryMemberCentralProfileRepository();
  const publicationSettingsRepository = new InMemoryPublicationSettingsRepository();
  const useCase = new GetPublicMemberProfileUseCase({
    memberRepository,
    memberCentralProfileRepository,
    publicationSettingsRepository,
  });
  return { useCase, memberRepository, publicationSettingsRepository };
}

describe('GetPublicMemberProfileUseCase', () => {
  it('devolve o DTO filtrado quando publicado', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(buildSettings());

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.nomeCompleto).toBe('Irmão de Teste');
    expect(result.value?.apresentacao).not.toBeNull();
    expect(result.value?.profissional).toBeNull(); // bloco desligado — chave inteira null
    expect(result.value?.contatos).toBeNull(); // nenhum contato autorizado
  });

  it('devolve null quando nunca publicou', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it('devolve null quando suspenso pela Administração (mesmo com profilePublished true)', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(
      buildSettings({ suspendedAt: new Date('2026-06-01'), suspendedBy: 'admin-1' }),
    );

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it('devolve null pra membro de outro tenant (isolamento multi-tenant)', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildUseCase();
    await memberRepository.create(buildMember({ tenantId: 't2' }));
    await publicationSettingsRepository.create(buildSettings({ tenantId: 't2' }));

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });
});
