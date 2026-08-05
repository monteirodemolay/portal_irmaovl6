import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { Role } from '../entities/role.entity';
import type { IRoleRepository } from '../repositories/role.repository';

export interface ListRolesDeps {
  roleRepository: IRoleRepository;
}

export class ListRolesUseCase {
  constructor(private readonly deps: ListRolesDeps) {}

  async execute(ctx: AuthContext): Promise<Role[]> {
    requirePermission(ctx, 'role:read');
    return this.deps.roleRepository.listByTenant(ctx.tenantId);
  }
}
