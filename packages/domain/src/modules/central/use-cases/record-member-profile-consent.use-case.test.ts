import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryAuditLogRepository,
  InMemoryMemberRepository,
  InMemoryPublicationConsentRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import { RecordMemberProfileConsentUseCase } from './record-member-profile-consent.use-case';

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

function buildUseCase() {
  const publicationConsentRepository = new InMemoryPublicationConsentRepository();
  const memberRepository = new InMemoryMemberRepository();
  const auditLogRepository = new InMemoryAuditLogRepository();
  const useCase = new RecordMemberProfileConsentUseCase({
    publicationConsentRepository,
    memberRepository,
    auditLogRepository,
    clock: new FixedClock(new Date('2026-03-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, publicationConsentRepository, memberRepository, auditLogRepository };
}

describe('RecordMemberProfileConsentUseCase', () => {
  it('registra canal, data, recordedBy e os blocos autorizados', async () => {
    const { useCase, memberRepository, publicationConsentRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute(adminCtx, {
      memberId: 'member-1',
      termoVersao: 'v1',
      confirmationChannel: 'whatsapp',
      note: 'Confirmado por áudio no grupo da Loja',
      blocksAuthorized: ['apresentacao', 'profissional'],
      contactsAuthorized: ['whatsapp'],
      externalLinksAuthorized: [],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.source).toBe('assisted_admin');
    expect(result.value.recordedBy).toBe('admin-1');
    expect(result.value.confirmationChannel).toBe('whatsapp');
    expect(result.value.acceptedAt).toEqual(new Date('2026-03-01T00:00:00Z'));
    expect(result.value.blocksAuthorized).toEqual(['apresentacao', 'profissional']);

    const stored = await publicationConsentRepository.listByMemberId('t1', 'member-1');
    expect(stored).toHaveLength(1);
  });

  it('nunca aceita source como input — a origem é sempre assisted_admin (não é possível forjar self_service)', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute(adminCtx, {
      memberId: 'member-1',
      termoVersao: 'v1',
      confirmationChannel: 'presencial',
      note: null,
      blocksAuthorized: ['apresentacao'],
      contactsAuthorized: [],
      externalLinksAuthorized: [],
      // @ts-expect-error — o input desta Use Case não tem campo `source`; não há como forjar.
      source: 'self_service',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.source).toBe('assisted_admin');
  });

  it('rejeita quem não tem memberCentral:manage', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    await expect(
      useCase.execute(noPermCtx, {
        memberId: 'member-1',
        termoVersao: 'v1',
        confirmationChannel: 'presencial',
        note: null,
        blocksAuthorized: ['apresentacao'],
        contactsAuthorized: [],
        externalLinksAuthorized: [],
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('rejeita memberId de outro tenant', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ id: 'member-2', tenantId: 't2' }));

    const result = await useCase.execute(adminCtx, {
      memberId: 'member-2',
      termoVersao: 'v1',
      confirmationChannel: 'presencial',
      note: null,
      blocksAuthorized: ['apresentacao'],
      contactsAuthorized: [],
      externalLinksAuthorized: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita quando nada foi selecionado para autorizar', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute(adminCtx, {
      memberId: 'member-1',
      termoVersao: 'v1',
      confirmationChannel: 'presencial',
      note: null,
      blocksAuthorized: [],
      contactsAuthorized: [],
      externalLinksAuthorized: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });
});
