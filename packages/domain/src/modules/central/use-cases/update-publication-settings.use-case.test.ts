import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryMemberRepository,
  InMemoryPublicationConsentRepository,
  InMemoryPublicationSettingsRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import { UpdatePublicationSettingsUseCase } from './update-publication-settings.use-case';

const ctx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['memberCentral:update'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['memberDirectory:read'],
};

const member: Member = {
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
};

const NO_BLOCKS = {
  apresentacao: false,
  informacoesPessoais: false,
  profissional: false,
  empresa: false,
  informacoesMaconicas: false,
  competencias: false,
  servicos: false,
  endereco: false,
  memoriaFotografica: false,
};
const NO_CONTACTS = { telefone: false, whatsapp: false, email: false };
const NO_LINKS = {
  whatsapp: false,
  instagram: false,
  facebook: false,
  linkedin: false,
  lattes: false,
  site: false,
};

function buildUseCase() {
  const memberRepository = new InMemoryMemberRepository();
  const publicationSettingsRepository = new InMemoryPublicationSettingsRepository();
  const publicationConsentRepository = new InMemoryPublicationConsentRepository();
  const useCase = new UpdatePublicationSettingsUseCase({
    memberRepository,
    publicationSettingsRepository,
    publicationConsentRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, memberRepository, publicationSettingsRepository, publicationConsentRepository };
}

describe('UpdatePublicationSettingsUseCase', () => {
  it('primeira publicação: liga profilePublished e grava consentimento de grant', async () => {
    const {
      useCase,
      memberRepository,
      publicationSettingsRepository,
      publicationConsentRepository,
    } = buildUseCase();
    await memberRepository.create(member);

    const result = await useCase.execute(
      ctx,
      {
        blocks: { ...NO_BLOCKS, apresentacao: true },
        contacts: NO_CONTACTS,
        externalLinks: NO_LINKS,
      },
      'v1',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.profilePublished).toBe(true);
    expect(result.value.blocks.apresentacao).toBe(true);

    const stored = await publicationSettingsRepository.findByMemberId('t1', 'member-1');
    expect(stored?.profilePublished).toBe(true);

    const consents = await publicationConsentRepository.listByMemberId('t1', 'member-1');
    expect(consents).toHaveLength(1);
    expect(consents[0]?.action).toBe('grant');
    expect(consents[0]?.blocksAuthorized).toEqual(['apresentacao']);
  });

  it('desligar um bloco já publicado gera revoke, mas profilePublished continua true', async () => {
    const { useCase, memberRepository, publicationConsentRepository } = buildUseCase();
    await memberRepository.create(member);

    await useCase.execute(
      ctx,
      {
        blocks: { ...NO_BLOCKS, apresentacao: true },
        contacts: NO_CONTACTS,
        externalLinks: NO_LINKS,
      },
      'v1',
    );
    const second = await useCase.execute(
      ctx,
      { blocks: NO_BLOCKS, contacts: NO_CONTACTS, externalLinks: NO_LINKS },
      'v1',
    );

    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.profilePublished).toBe(true); // só Withdraw desliga de vez
    expect(second.value.blocks.apresentacao).toBe(false);

    const consents = await publicationConsentRepository.listByMemberId('t1', 'member-1');
    expect(consents).toHaveLength(2);
    const revoke = consents.find((c) => c.action === 'revoke');
    expect(revoke?.blocksAuthorized).toEqual(['apresentacao']);
  });

  it('não grava consentimento quando nada muda de estado', async () => {
    const { useCase, memberRepository, publicationConsentRepository } = buildUseCase();
    await memberRepository.create(member);

    const result = await useCase.execute(
      ctx,
      { blocks: NO_BLOCKS, contacts: NO_CONTACTS, externalLinks: NO_LINKS },
      'v1',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.profilePublished).toBe(false);
    const consents = await publicationConsentRepository.listByMemberId('t1', 'member-1');
    expect(consents).toHaveLength(0);
  });

  it('lança ForbiddenError sem memberCentral:update', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(member);

    await expect(
      useCase.execute(
        readOnlyCtx,
        { blocks: NO_BLOCKS, contacts: NO_CONTACTS, externalLinks: NO_LINKS },
        'v1',
      ),
    ).rejects.toThrow(ForbiddenError);
  });
});
