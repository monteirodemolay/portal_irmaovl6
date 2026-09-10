import type { MemberAccessClaim } from '../entities/member-access-claim.entity';

export interface IMemberAccessClaimRepository {
  findById(id: string): Promise<MemberAccessClaim | null>;
  /** Usado pra bloquear uma segunda solicitação enquanto a primeira ainda não foi revisada. */
  findPendingByMember(tenantId: string, memberId: string): Promise<MemberAccessClaim | null>;
  listPendingByTenant(tenantId: string): Promise<MemberAccessClaim[]>;
  create(claim: MemberAccessClaim): Promise<void>;
  update(claim: MemberAccessClaim): Promise<void>;
}
