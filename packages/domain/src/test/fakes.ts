import type { IClock, IIdGenerator } from '../shared/ports';
import type { Tenant } from '../modules/tenancy/entities/tenant.entity';
import type { TenantBranding } from '../modules/tenancy/entities/tenant-branding.entity';
import type { TenantSettings } from '../modules/tenancy/entities/tenant-settings.entity';
import type { ITenantRepository } from '../modules/tenancy/repositories/tenant.repository';
import type { ITenantBrandingRepository } from '../modules/tenancy/repositories/tenant-branding.repository';
import type { ITenantSettingsRepository } from '../modules/tenancy/repositories/tenant-settings.repository';
import type { Role } from '../modules/identity-access/entities/role.entity';
import type { User } from '../modules/identity-access/entities/user.entity';
import type { IRoleRepository } from '../modules/identity-access/repositories/role.repository';
import type { IUserRepository } from '../modules/identity-access/repositories/user.repository';

export class FixedClock implements IClock {
  constructor(private readonly fixed: Date = new Date('2026-01-01T00:00:00Z')) {}
  now(): Date {
    return this.fixed;
  }
}

export class SequentialIdGenerator implements IIdGenerator {
  private counter = 0;
  next(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

export class InMemoryTenantRepository implements ITenantRepository {
  private readonly byId = new Map<string, Tenant>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findByDomain(domain: string) {
    return [...this.byId.values()].find((t) => t.dominio === domain) ?? null;
  }
  async findBySubdomain(subdomain: string) {
    return [...this.byId.values()].find((t) => t.subdominio === subdomain) ?? null;
  }
  async existsBySubdomain(subdomain: string) {
    return [...this.byId.values()].some((t) => t.subdominio === subdomain);
  }
  async create(tenant: Tenant) {
    this.byId.set(tenant.id, tenant);
  }
  async update(tenant: Tenant) {
    this.byId.set(tenant.id, tenant);
  }
}

export class InMemoryTenantBrandingRepository implements ITenantBrandingRepository {
  private readonly byTenantId = new Map<string, TenantBranding>();
  async findByTenantId(tenantId: string) {
    return this.byTenantId.get(tenantId) ?? null;
  }
  async create(branding: TenantBranding) {
    this.byTenantId.set(branding.tenantId, branding);
  }
  async update(branding: TenantBranding) {
    this.byTenantId.set(branding.tenantId, branding);
  }
}

export class InMemoryTenantSettingsRepository implements ITenantSettingsRepository {
  private readonly byTenantId = new Map<string, TenantSettings>();
  async findByTenantId(tenantId: string) {
    return this.byTenantId.get(tenantId) ?? null;
  }
  async create(settings: TenantSettings) {
    this.byTenantId.set(settings.tenantId, settings);
  }
  async update(settings: TenantSettings) {
    this.byTenantId.set(settings.tenantId, settings);
  }
}

export class InMemoryRoleRepository implements IRoleRepository {
  private readonly byId = new Map<string, Role>();
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findByKey(tenantId: string, chave: string) {
    return (
      [...this.byId.values()].find((r) => r.tenantId === tenantId && r.chave === chave) ?? null
    );
  }
  async listByTenant(tenantId: string) {
    return [...this.byId.values()].filter((r) => r.tenantId === tenantId);
  }
  async create(role: Role) {
    this.byId.set(role.id, role);
  }
  async update(role: Role) {
    this.byId.set(role.id, role);
  }
}

export class InMemoryUserRepository implements IUserRepository {
  private readonly byId = new Map<string, User>();
  async findById(uid: string) {
    return this.byId.get(uid) ?? null;
  }
  async findByEmail(tenantId: string, email: string) {
    return (
      [...this.byId.values()].find((u) => u.tenantId === tenantId && u.email === email) ?? null
    );
  }
  async create(user: User) {
    this.byId.set(user.id, user);
  }
  async update(user: User) {
    this.byId.set(user.id, user);
  }
}
