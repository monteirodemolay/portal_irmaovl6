import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryMemberAccessClaimRepository } from '../../../test/fakes';
import type { MemberAccessClaim } from '../entities/member-access-claim.entity';
import { ListPendingMemberAccessClaimsUseCase } from './list-pending-member-access-claims.use-case';

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

describe('ListPendingMemberAccessClaimsUseCase', () => {
  it('lista só as solicitações pendentes do tenant', async () => {
    const memberAccessClaimRepository = new InMemoryMemberAccessClaimRepository();
    await memberAccessClaimRepository.create(buildClaim());
    await memberAccessClaimRepository.create(
      buildClaim({ id: 'claim-2', revisaoStatus: 'aprovada' }),
    );
    await memberAccessClaimRepository.create(
      buildClaim({ id: 'claim-3', tenantId: 'other-tenant' }),
    );
    const useCase = new ListPendingMemberAccessClaimsUseCase({ memberAccessClaimRepository });

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('claim-1');
  });

  it('recusa sem permissão', async () => {
    const memberAccessClaimRepository = new InMemoryMemberAccessClaimRepository();
    const useCase = new ListPendingMemberAccessClaimsUseCase({ memberAccessClaimRepository });

    await expect(useCase.execute(readOnlyCtx)).rejects.toThrow();
  });
});
