import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryMemberRepository } from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import { UpdateMemberMemorialMessageUseCase } from './update-member-memorial-message.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:update'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['member:read'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: null,
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
    cim: '12566',
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'falecido',
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
    dataFalecimento: new Date('2026-04-10'),
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
  const memberRepository = new InMemoryMemberRepository();
  const useCase = new UpdateMemberMemorialMessageUseCase({
    memberRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, memberRepository };
}

describe('UpdateMemberMemorialMessageUseCase', () => {
  it('grava a mensagem de homenagem para um Irmão em In Memoriam', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute(ctx, 'member-1', 'Um Irmão exemplar, sempre lembrado.');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mensagemHomenagem).toBe('Um Irmão exemplar, sempre lembrado.');
  });

  it('recusa para Irmão que não está em In Memoriam', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ situacao: 'ativo', dataFalecimento: null }));

    const result = await useCase.execute(ctx, 'member-1', 'Texto qualquer');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
  });

  it('recusa sem permissão', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    await expect(useCase.execute(readOnlyCtx, 'member-1', 'Texto')).rejects.toThrow();
  });

  it('recusa Member inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'ghost', 'Texto');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
