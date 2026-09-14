import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import type { Member } from '../entities/member.entity';
import type { User } from '../../identity-access/entities/user.entity';
import { InMemoryMemberRepository, InMemoryUserRepository } from '../../../test/fakes';
import {
  decideActiveMembersReconciliationAction,
  PreviewActiveMembersReconciliationUseCase,
} from './preview-active-members-reconciliation.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:manage'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: null,
    nomeCompleto: 'Luis Eduardo Monteiro Lima',
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
    lojaId: 'loja-1',
    potencia: 'GLEG',
    profissao: null,
    empresa: null,
    estadoCivil: null,
    conjugeNome: null,
    conjugeDataNascimento: null,
    dataCasamento: null,
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    autorizaDivulgacaoExterna: false,
    conjugeAniversarioDia: null,
    conjugeAniversarioMes: null,
    filhos: [],
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  } as Member;
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    tenantId: 't1',
    email: 'irmao@example.com',
    memberId: 'member-1',
    roleId: 'role-membro',
    mfaHabilitado: false,
    ultimoLogin: null,
    statusConta: 'active',
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

describe('decideActiveMembersReconciliationAction', () => {
  it('na lista + ativo -> mantém ativo', () => {
    expect(decideActiveMembersReconciliationAction('ativo', true)).toBe('manter_ativo');
  });

  it('na lista + outra situação -> pede confirmação manual', () => {
    expect(decideActiveMembersReconciliationAction('licenciado', true)).toBe(
      'confirmar_manualmente',
    );
  });

  it('fora da lista + ativo -> desliga e bloqueia', () => {
    expect(decideActiveMembersReconciliationAction('ativo', false)).toBe('desligar_e_bloquear');
  });

  it('fora da lista + outra situação -> só bloqueia acesso', () => {
    expect(decideActiveMembersReconciliationAction('suspenso', false)).toBe('so_bloquear_acesso');
    expect(decideActiveMembersReconciliationAction('desligado', false)).toBe('so_bloquear_acesso');
  });

  it('fora da lista + falecido -> nunca mexe', () => {
    expect(decideActiveMembersReconciliationAction('falecido', false)).toBe(
      'sem_alteracao_falecido',
    );
  });
});

describe('PreviewActiveMembersReconciliationUseCase', () => {
  it('casa por nome normalizado (sem acento/maiúscula) e reporta acesso ao Portal', async () => {
    const memberRepository = new InMemoryMemberRepository();
    const userRepository = new InMemoryUserRepository();
    await memberRepository.create(
      buildMember({ id: 'm1', nomeCompleto: 'luis eduardo monteiro lima' }),
    );
    await memberRepository.create(
      buildMember({ id: 'm2', nomeCompleto: 'Fulano de Tal', situacao: 'ativo' }),
    );
    await userRepository.create(buildUser({ id: 'u2', memberId: 'm2', statusConta: 'active' }));

    const useCase = new PreviewActiveMembersReconciliationUseCase({
      memberRepository,
      userRepository,
    });
    const preview = await useCase.execute(ctx);

    const luis = preview.linhas.find((l) => l.memberId === 'm1');
    const fulano = preview.linhas.find((l) => l.memberId === 'm2');

    expect(luis?.naLista).toBe(true);
    expect(luis?.acao).toBe('manter_ativo');
    expect(fulano?.naLista).toBe(false);
    expect(fulano?.acao).toBe('desligar_e_bloquear');
    expect(fulano?.temAcessoAtivo).toBe(true);
  });

  it('lista nomes da lista-alvo sem cadastro correspondente', async () => {
    const memberRepository = new InMemoryMemberRepository();
    const userRepository = new InMemoryUserRepository();

    const useCase = new PreviewActiveMembersReconciliationUseCase({
      memberRepository,
      userRepository,
    });
    const preview = await useCase.execute(ctx);

    expect(preview.nomesNaoEncontrados).toContain('Luis Eduardo Monteiro Lima');
  });

  it('lança ForbiddenError quando falta a permissão member:manage', async () => {
    const memberRepository = new InMemoryMemberRepository();
    const userRepository = new InMemoryUserRepository();
    const useCase = new PreviewActiveMembersReconciliationUseCase({
      memberRepository,
      userRepository,
    });
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao)).rejects.toThrow(ForbiddenError);
  });
});
