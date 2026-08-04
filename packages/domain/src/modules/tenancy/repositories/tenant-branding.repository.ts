import type { TenantBranding } from '../entities/tenant-branding.entity';

export interface ITenantBrandingRepository {
  findByTenantId(tenantId: string): Promise<TenantBranding | null>;
  create(branding: TenantBranding): Promise<void>;
  update(branding: TenantBranding): Promise<void>;
}
