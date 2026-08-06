import type { AuthContext } from '../../../shared/auth-context';
import { requirePlatformAdmin } from '../../../shared/auth-context';
import type { Tenant } from '../entities/tenant.entity';
import type { ITenantRepository } from '../repositories/tenant.repository';

export interface ListAllTenantsDeps {
  tenantRepository: ITenantRepository;
}

/** Listagem cross-tenant do painel do Administrador Geral — única chamadora de `listAll`. */
export class ListAllTenantsUseCase {
  constructor(private readonly deps: ListAllTenantsDeps) {}

  async execute(ctx: AuthContext): Promise<Tenant[]> {
    requirePlatformAdmin(ctx);
    return this.deps.tenantRepository.listAll();
  }
}
