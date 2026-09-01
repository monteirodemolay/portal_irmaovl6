import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, ValidationError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryAuditLogRepository,
  InMemoryMemberRepository,
  InMemoryPublicationConsentRepository,
  InMemoryPublicationSettingsRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { PublicationConsent } from '../entities/publication-consent.entity';
import { PublishMemberProfileBlocksUseCase } from './publish-member-profile-blocks.use-case';

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

function buildConsent(overrides: Partial<PublicationConsent> = {}): PublicationConsent {
  return {
    id: 'consent-1',
    tenantId: 't1',
    memberId: 'member-1',
    termoVersao: 'v1',
    acceptedAt: new Date('2026-02-01T00:00:00Z'),
    action: 'grant',
    blocksAuthorized: [],
    contactsAuthorized: [],
    externalLinksAuthorized: [],
    source: 'assisted_admin',
    recordedBy: 'admin-1',
    confirmationChannel: 'whatsapp',
    note: null,
    ...overrides,
  };
}

function buildUseCase() {
  const publicationSettingsRepository = new InMemoryPublicationSettingsRepository();
  const publicationConsentRepository = new InMemoryPublicationConsentRepository();
  const memberRepository = new InMemoryMemberRepository();
  const auditLogRepository = new InMemoryAuditLogRepository();
  const useCase = new PublishMemberProfileBlocksUseCase({
    publicationSettingsRepository,
    publicationConsentRepository,
    memberRepository,
    auditLogRepository,
    clock: new FixedClock(new Date('2026-03-05T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, publicationSettingsRepository, publicationConsentRepository, memberRepository };
}

describe('PublishMemberProfileBlocksUseCase', () => {
  it('publica só os blocos com consentimento vigente', async () => {
    const {
      useCase,
      memberRepository,
      publicationConsentRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationConsentRepository.append(
      buildConsent({ blocksAuthorized: ['apresentacao', 'profissional'] }),
    );

    const result = await useCase.execute(adminCtx, {
      memberId: 'member-1',
      blocks: ['apresentacao'],
      contacts: [],
      externalLinks: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.profilePublished).toBe(true);
    expect(result.value.blocks.apresentacao).toBe(true);
    expect(result.value.blocks.profissional).toBe(false); // autorizado mas não pedido nesta publicação

    const stored = await publicationSettingsRepository.findByMemberId('t1', 'member-1');
    expect(stored?.blocks.apresentacao).toBe(true);
  });

  it('rejeita publicar um bloco sem consentimento registrado — nada é publicado', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    // Sem nenhum PublicationConsent gravado.

    const result = await useCase.execute(adminCtx, {
      memberId: 'member-1',
      blocks: ['apresentacao'],
      contacts: [],
      externalLinks: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
    const stored = await publicationSettingsRepository.findByMemberId('t1', 'member-1');
    expect(stored).toBeNull();
  });

  it('um revoke posterior ao grant torna o bloco não autorizado de novo', async () => {
    const { useCase, memberRepository, publicationConsentRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationConsentRepository.append(
      buildConsent({
        id: 'consent-1',
        blocksAuthorized: ['apresentacao'],
        acceptedAt: new Date('2026-02-01T00:00:00Z'),
      }),
    );
    await publicationConsentRepository.append(
      buildConsent({
        id: 'consent-2',
        action: 'revoke',
        blocksAuthorized: ['apresentacao'],
        acceptedAt: new Date('2026-02-15T00:00:00Z'),
      }),
    );

    const result = await useCase.execute(adminCtx, {
      memberId: 'member-1',
      blocks: ['apresentacao'],
      contacts: [],
      externalLinks: [],
    });

    expect(result.ok).toBe(false);
  });

  it('rejeita quem não tem memberCentral:manage', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    await expect(
      useCase.execute(noPermCtx, {
        memberId: 'member-1',
        blocks: [],
        contacts: [],
        externalLinks: [],
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});
