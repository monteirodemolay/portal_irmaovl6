import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryMemberRepository,
  InMemoryMemberAccessClaimRepository,
} from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import type { MemberAccessClaim } from '../entities/member-access-claim.entity';
import { ApproveMemberAccessClaimUseCase } from './approve-member-access-claim.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:manage'],
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

function buildClaim(overrides: Partial<MemberAccessClaim> = {}): MemberAccessClaim {
  return {
    id: 'claim-1',
    tenantId: 't1',
    memberId: 'member-1',
    emailSolicitado: 'novo@vl6.test',
    ip: '203.0.113.5',
    revisaoStatus: 'pendente',
    motivoRejeicao: null,
    revisadoPor: null,
    revisadoEm: null,
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-01'),
    createdBy: 'self-claim',
    updatedBy: 'self-claim',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const memberRepository = new InMemoryMemberRepository();
  const memberAccessClaimRepository = new InMemoryMemberAccessClaimRepository();
  const useCase = new ApproveMemberAccessClaimUseCase({
    memberRepository,
    memberAccessClaimRepository,
    clock: new FixedClock(new Date('2026-06-02T00:00:00Z')),
  });
  return { useCase, memberRepository, memberAccessClaimRepository };
}

describe('ApproveMemberAccessClaimUseCase', () => {
  it('aprova a solicitação pendente e devolve claim + member', async () => {
    const { useCase, memberRepository, memberAccessClaimRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await memberAccessClaimRepository.create(buildClaim());

    const result = await useCase.execute(ctx, 'claim-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.claim.revisaoStatus).toBe('aprovada');
    expect(result.value.claim.revisadoPor).toBe('admin-1');
    expect(result.value.claim.revisadoEm).toEqual(new Date('2026-06-02T00:00:00Z'));
    expect(result.value.member.id).toBe('member-1');
  });

  it('recusa sem permissão', async () => {
    const { useCase, memberRepository, memberAccessClaimRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await memberAccessClaimRepository.create(buildClaim());

    await expect(useCase.execute(readOnlyCtx, 'claim-1')).rejects.toThrow();
  });

  it('recusa solicitação já revisada', async () => {
    const { useCase, memberRepository, memberAccessClaimRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await memberAccessClaimRepository.create(buildClaim({ revisaoStatus: 'aprovada' }));

    const result = await useCase.execute(ctx, 'claim-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });

  it('recusa quando o Member já ganhou acesso por outro caminho nesse meio-tempo', async () => {
    const { useCase, memberRepository, memberAccessClaimRepository } = buildUseCase();
    await memberRepository.create(buildMember({ userId: 'user-1' }));
    await memberAccessClaimRepository.create(buildClaim());

    const result = await useCase.execute(ctx, 'claim-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });

  it('recusa claim inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'ghost');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
