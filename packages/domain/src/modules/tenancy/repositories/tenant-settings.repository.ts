import type { TenantSettings } from '../entities/tenant-settings.entity';

export interface ITenantSettingsRepository {
  findByTenantId(tenantId: string): Promise<TenantSettings | null>;
  create(settings: TenantSettings): Promise<void>;
  update(settings: TenantSettings): Promise<void>;
}
