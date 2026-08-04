// Shared kernel
export * from './shared/base-entity';
export * from './shared/result';
export * from './shared/pagination';
export * from './shared/auth-context';
export * from './shared/ports';

// Tenancy
export * from './modules/tenancy/entities/tenant.entity';
export * from './modules/tenancy/entities/tenant-branding.entity';
export * from './modules/tenancy/entities/tenant-settings.entity';
export * from './modules/tenancy/repositories/tenant.repository';
export * from './modules/tenancy/repositories/tenant-branding.repository';
export * from './modules/tenancy/repositories/tenant-settings.repository';
export * from './modules/tenancy/use-cases/create-tenant.use-case';
export * from './modules/tenancy/use-cases/update-tenant-branding.use-case';
export * from './modules/tenancy/use-cases/resolve-tenant-by-host.use-case';

// Identity & Access
export * from './modules/identity-access/entities/user.entity';
export * from './modules/identity-access/entities/role.entity';
export * from './modules/identity-access/repositories/user.repository';
export * from './modules/identity-access/repositories/role.repository';
export * from './modules/identity-access/services/compute-user-claims';
export * from './modules/identity-access/use-cases/authenticate-user.use-case';
export * from './modules/identity-access/use-cases/assign-role.use-case';
export * from './modules/identity-access/use-cases/bootstrap-tenant-admin.use-case';
