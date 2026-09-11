import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  SequentialIdGenerator,
  InMemoryMemberRepository,
  InMemoryNotificationRepository,
  InMemoryNotificationPreferenceRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { INotificationGateway } from '../services/notification-gateway';
import { SendTargetedNotificationUseCase } from './send-targeted-notification.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['notification:manage'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['member:read'],
};

class NoopGateway implements INotificationGateway {
  async send() {}
}

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'm1',
    tenantId: 't1',
    userId: 'u1',
    nomeCompleto: 'Fulano de Tal',
    fotoUrl: null,
    email: null,
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
    dataFalecimento: null,
    mensagemHomenagem: null,
    lojaId: 't1',
    potencia: 'GLEG',
    profissao: null,
    empresa: null,
    estadoCivil: null,
    conjugeNome: null,
    conjugeDataNascimento: null,
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    autorizaDivulgacaoExterna: false,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildDeps() {
  const memberRepository = new InMemoryMemberRepository();
  const notificationRepository = new InMemoryNotificationRepository();
  const notificationPreferenceRepository = new InMemoryNotificationPreferenceRepository();
  const useCase = new SendTargetedNotificationUseCase({
    memberRepository,
    notificationRepository,
    notificationPreferenceRepository,
    notificationGateway: new NoopGateway(),
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, memberRepository, notificationRepository };
}

describe('SendTargetedNotificationUseCase', () => {
  it('envia pra cada Irmão selecionado com login vinculado', async () => {
    const deps = buildDeps();
    await deps.memberRepository.create(buildMember({ id: 'm1', userId: 'u1' }));
    await deps.memberRepository.create(buildMember({ id: 'm2', userId: 'u2' }));

    const result = await deps.useCase.execute(ctx, {
      memberIds: ['m1', 'm2'],
      titulo: 'Aviso pessoal',
      mensagem: 'Mensagem direcionada.',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ enviadas: 2, semAcesso: [] });

    const forU1 = await deps.notificationRepository.listByRecipient('t1', 'u1', { limit: 10 });
    expect(forU1.items).toHaveLength(1);
    expect(forU1.items[0]?.tipo).toBe('system');
    expect(forU1.items[0]?.titulo).toBe('Aviso pessoal');
  });

  it('lista Irmãos sem login vinculado no relatório, sem travar o envio dos outros', async () => {
    const deps = buildDeps();
    await deps.memberRepository.create(buildMember({ id: 'm1', userId: 'u1' }));
    await deps.memberRepository.create(
      buildMember({ id: 'm2', userId: null, nomeCompleto: 'Sem Acesso' }),
    );

    const result = await deps.useCase.execute(ctx, {
      memberIds: ['m1', 'm2'],
      titulo: 'Aviso',
      mensagem: 'Mensagem.',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.enviadas).toBe(1);
    expect(result.value.semAcesso).toEqual([{ id: 'm2', nomeCompleto: 'Sem Acesso' }]);
  });

  it('recusa sem selecionar nenhum Irmão', async () => {
    const deps = buildDeps();
    const result = await deps.useCase.execute(ctx, {
      memberIds: [],
      titulo: 'Aviso',
      mensagem: 'Mensagem.',
    });
    expect(result.ok).toBe(false);
  });

  it('recusa sem título ou mensagem', async () => {
    const deps = buildDeps();
    await deps.memberRepository.create(buildMember({ id: 'm1' }));
    const result = await deps.useCase.execute(ctx, {
      memberIds: ['m1'],
      titulo: '  ',
      mensagem: 'Mensagem.',
    });
    expect(result.ok).toBe(false);
  });

  it('recusa sem permissão', async () => {
    const deps = buildDeps();
    await deps.memberRepository.create(buildMember({ id: 'm1' }));
    await expect(
      deps.useCase.execute(readOnlyCtx, {
        memberIds: ['m1'],
        titulo: 'Aviso',
        mensagem: 'Mensagem.',
      }),
    ).rejects.toThrow();
  });
});
