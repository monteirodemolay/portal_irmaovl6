import { describe, expect, it } from 'vitest';
import {
  FixedClock,
  SequentialIdGenerator,
  InMemoryMemberRepository,
  InMemoryMemberAccessClaimRepository,
} from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import { SubmitMemberAccessClaimUseCase } from './submit-member-access-claim.use-case';

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
  const memberRepository = new InMemoryMemberRepository();
  const memberAccessClaimRepository = new InMemoryMemberAccessClaimRepository();
  const useCase = new SubmitMemberAccessClaimUseCase({
    memberRepository,
    memberAccessClaimRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, memberRepository, memberAccessClaimRepository };
}

describe('SubmitMemberAccessClaimUseCase', () => {
  it('cria a solicitação pendente quando o CIM confere, sem tocar no Member', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute('t1', 'member-1', '12566', 'novo@vl6.test', '203.0.113.5');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.revisaoStatus).toBe('pendente');
    expect(result.value.emailSolicitado).toBe('novo@vl6.test');
    expect(result.value.ip).toBe('203.0.113.5');

    const stored = await memberRepository.findById('member-1');
    expect(stored?.email).toBeNull();
    expect(stored?.userId).toBeNull();
  });

  it('recusa com CIM errado sem revelar o motivo específico', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute('t1', 'member-1', '00000', 'novo@vl6.test', null);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
  });

  it('recusa quando o Member já tem acesso vinculado', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ userId: 'user-1' }));

    const result = await useCase.execute('t1', 'member-1', '12566', 'novo@vl6.test', null);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
  });

  it('recusa Member de outro tenant', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ tenantId: 'other-tenant' }));

    const result = await useCase.execute('t1', 'member-1', '12566', 'novo@vl6.test', null);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('recusa Member inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute('t1', 'ghost', '12566', 'novo@vl6.test', null);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('recusa uma segunda solicitação enquanto a primeira está pendente', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const first = await useCase.execute('t1', 'member-1', '12566', 'novo@vl6.test', null);
    expect(first.ok).toBe(true);

    const second = await useCase.execute('t1', 'member-1', '12566', 'outro@vl6.test', null);
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error.code).toBe('validation');
  });
});
