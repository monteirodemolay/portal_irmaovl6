import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { MemberAccessClaim } from '../entities/member-access-claim.entity';
import type { IMemberAccessClaimRepository } from '../repositories/member-access-claim.repository';

export interface ListPendingMemberAccessClaimsDeps {
  memberAccessClaimRepository: IMemberAccessClaimRepository;
}

/** Fila de revisão do Administrador — só solicitações em `pendente`, `member:manage`. */
export class ListPendingMemberAccessClaimsUseCase {
  constructor(private readonly deps: ListPendingMemberAccessClaimsDeps) {}

  async execute(ctx: AuthContext): Promise<MemberAccessClaim[]> {
    requirePermission(ctx, 'member:manage');
    return this.deps.memberAccessClaimRepository.listPendingByTenant(ctx.tenantId);
  }
}
