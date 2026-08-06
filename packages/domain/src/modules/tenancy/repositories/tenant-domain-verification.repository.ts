import type { TenantDomainVerification } from '../entities/tenant-domain-verification.entity';

export interface ITenantDomainVerificationRepository {
  findByDomain(domain: string): Promise<TenantDomainVerification | null>;
  findByTenantId(tenantId: string): Promise<TenantDomainVerification | null>;
  create(entry: TenantDomainVerification): Promise<void>;
  update(entry: TenantDomainVerification): Promise<void>;
}
