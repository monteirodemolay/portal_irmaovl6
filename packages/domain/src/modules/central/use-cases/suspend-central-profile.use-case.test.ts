import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryMemberRepository,
  InMemoryPublicationSettingsRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { PublicationSettings } from '../entities/publication-settings.entity';
import { SuspendCentralProfileUseCase } from './suspend-central-profile.use-case';

const adminCtx: AuthContext = {
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

function buildSettings(): PublicationSettings {
  return {
    id: 'settings-1',
    tenantId: 't1',
    memberId: 'member-1',
    profilePublished: false, // titular nunca publicou
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
    createdBy: 'user-1',
    updatedBy: 'user-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
}

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
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

function buildUseCase() {
  const publicationSettingsRepository = new InMemoryPublicationSettingsRepository();
  const memberRepository = new InMemoryMemberRepository();
  const useCase = new SuspendCentralProfileUseCase({
    publicationSettingsRepository,
    memberRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, publicationSettingsRepository, memberRepository };
}

describe('SuspendCentralProfileUseCase', () => {
  it('nunca liga profilePublished/blocks — só mexe nos campos de suspensão', async () => {
    const { useCase, publicationSettingsRepository } = buildUseCase();
    await publicationSettingsRepository.create(buildSettings());

    const result = await useCase.execute(adminCtx, 'member-1', 'Conteúdo inadequado');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // "Suspender" quem nunca publicou não pode virar um jeito disfarçado de publicar.
    expect(result.value.profilePublished).toBe(false);
    expect(result.value.blocks.apresentacao).toBe(false);
    expect(result.value.suspendedAt).not.toBeNull();
    expect(result.value.suspendedBy).toBe('admin-1');
    expect(result.value.suspendedReason).toBe('Conteúdo inadequado');
  });

  it('exige motivo não vazio', async () => {
    const { useCase, publicationSettingsRepository } = buildUseCase();
    await publicationSettingsRepository.create(buildSettings());

    const result = await useCase.execute(adminCtx, 'member-1', '   ');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
  });

  it('lança ForbiddenError sem memberCentral:manage', async () => {
    const { useCase, publicationSettingsRepository } = buildUseCase();
    await publicationSettingsRepository.create(buildSettings());

    await expect(useCase.execute(readOnlyCtx, 'member-1', 'motivo')).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('cria PublicationSettings e já suspende quando o titular nunca configurou nada', async () => {
    const { useCase, publicationSettingsRepository, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute(adminCtx, 'member-1', 'Denúncia de conteúdo impróprio');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Preserva o efetivo aberto atual (resolveEffectivePublication(null)) —
    // suspender não pode inventar um "fechado" que o titular nunca escolheu.
    expect(result.value.profilePublished).toBe(true);
    expect(result.value.blocks.apresentacao).toBe(true);
    expect(result.value.suspendedAt).not.toBeNull();
    expect(result.value.suspendedReason).toBe('Denúncia de conteúdo impróprio');

    const stored = await publicationSettingsRepository.findByMemberId('t1', 'member-1');
    expect(stored?.suspendedAt).not.toBeNull();
  });

  it('retorna NotFoundError quando o Irmão não existe', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(adminCtx, 'nao-existe', 'motivo');

    expect(result.ok).toBe(false);
  });
});
