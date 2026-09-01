import { describe, expect, it } from 'vitest';
import { FixedClock, InMemoryMemberRepository } from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import { ClaimMemberAccountUseCase } from './claim-member-account.use-case';

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
    situacao: 'ativo',
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
  const useCase = new ClaimMemberAccountUseCase({
    memberRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, memberRepository };
}

describe('ClaimMemberAccountUseCase', () => {
  it('grava o e-mail quando o CIM confere e o Member ainda não tem acesso', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute('t1', 'member-1', '12566', 'novo@vl6.test');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.email).toBe('novo@vl6.test');
    expect(result.value.updatedBy).toBe('self-claim');

    const stored = await memberRepository.findById('member-1');
    expect(stored?.email).toBe('novo@vl6.test');
  });

  it('recusa com CIM errado sem revelar o motivo específico', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute('t1', 'member-1', '00000', 'novo@vl6.test');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
  });

  it('recusa quando o Member já tem acesso vinculado', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ userId: 'user-1' }));

    const result = await useCase.execute('t1', 'member-1', '12566', 'novo@vl6.test');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
  });

  it('recusa Member de outro tenant', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ tenantId: 'other-tenant' }));

    const result = await useCase.execute('t1', 'member-1', '12566', 'novo@vl6.test');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('recusa Member inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute('t1', 'ghost', '12566', 'novo@vl6.test');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
