import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryAuditLogRepository,
  InMemoryMemberRepository,
  InMemoryPublicationConsentRepository,
  InMemoryPublicationSettingsRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { PublicationSettings } from '../entities/publication-settings.entity';
import { RevokeMemberProfileConsentUseCase } from './revoke-member-profile-consent.use-case';

const adminCtx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r-admin',
  permissions: ['memberCentral:manage'],
};

const noPermCtx: AuthContext = {
  uid: 'regular-1',
  tenantId: 't1',
  roleId: 'r-member',
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
      profissional: true,
      empresa: false,
      informacoesMaconicas: false,
      competencias: false,
      servicos: false,
      endereco: false,
      memoriaFotografica: false,
    },
    contacts: { telefone: false, whatsapp: true, email: false },
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
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const publicationSettingsRepository = new InMemoryPublicationSettingsRepository();
  const publicationConsentRepository = new InMemoryPublicationConsentRepository();
  const memberRepository = new InMemoryMemberRepository();
  const auditLogRepository = new InMemoryAuditLogRepository();
  const useCase = new RevokeMemberProfileConsentUseCase({
    publicationSettingsRepository,
    publicationConsentRepository,
    memberRepository,
    auditLogRepository,
    clock: new FixedClock(new Date('2026-03-10T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, publicationSettingsRepository, publicationConsentRepository, memberRepository };
}

describe('RevokeMemberProfileConsentUseCase', () => {
  it('revogar um bloco esconde ele imediatamente em PublicationSettings', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(buildSettings());

    const result = await useCase.execute(adminCtx, {
      memberId: 'member-1',
      termoVersao: 'v1',
      note: 'Irmão pediu por telefone para remover',
      blocksRevoked: ['apresentacao'],
      contactsRevoked: [],
      externalLinksRevoked: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.source).toBe('assisted_admin');
    expect(result.value.action).toBe('revoke');

    const stored = await publicationSettingsRepository.findByMemberId('t1', 'member-1');
    expect(stored?.blocks.apresentacao).toBe(false);
    expect(stored?.blocks.profissional).toBe(true); // não pedido, permanece
  });

  it('rejeita quem não tem memberCentral:manage', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(buildSettings());

    await expect(
      useCase.execute(noPermCtx, {
        memberId: 'member-1',
        termoVersao: 'v1',
        note: null,
        blocksRevoked: ['apresentacao'],
        contactsRevoked: [],
        externalLinksRevoked: [],
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});
