import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryMemberAccessClaimRepository } from '../../../test/fakes';
import type { MemberAccessClaim } from '../entities/member-access-claim.entity';
import { RejectMemberAccessClaimUseCase } from './reject-member-access-claim.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:manage'],
};

function buildClaim(overrides: Partial<MemberAccessClaim> = {}): MemberAccessClaim {
  return {
    id: 'claim-1',
    tenantId: 't1',
    memberId: 'member-1',
    emailSolicitado: 'novo@vl6.test',
    ip: null,
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
  const memberAccessClaimRepository = new InMemoryMemberAccessClaimRepository();
  const useCase = new RejectMemberAccessClaimUseCase({
    memberAccessClaimRepository,
    clock: new FixedClock(new Date('2026-06-02T00:00:00Z')),
  });
  return { useCase, memberAccessClaimRepository };
}

describe('RejectMemberAccessClaimUseCase', () => {
  it('rejeita com motivo, sem soft-delete', async () => {
    const { useCase, memberAccessClaimRepository } = buildUseCase();
    await memberAccessClaimRepository.create(buildClaim());

    const result = await useCase.execute(ctx, 'claim-1', 'E-mail não corresponde ao Irmão.');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.revisaoStatus).toBe('rejeitada');
    expect(result.value.motivoRejeicao).toBe('E-mail não corresponde ao Irmão.');
    expect(result.value.deletedAt).toBeNull();
  });

  it('exige motivo', async () => {
    const { useCase, memberAccessClaimRepository } = buildUseCase();
    await memberAccessClaimRepository.create(buildClaim());

    const result = await useCase.execute(ctx, 'claim-1', '   ');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
  });

  it('recusa solicitação já revisada', async () => {
    const { useCase, memberAccessClaimRepository } = buildUseCase();
    await memberAccessClaimRepository.create(buildClaim({ revisaoStatus: 'rejeitada' }));

    const result = await useCase.execute(ctx, 'claim-1', 'Motivo');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });

  it('recusa claim inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'ghost', 'Motivo');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
