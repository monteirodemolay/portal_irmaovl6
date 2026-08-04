import type { Role } from '../entities/role.entity';

export interface IRoleRepository {
  findById(id: string): Promise<Role | null>;
  findByKey(tenantId: string, chave: string): Promise<Role | null>;
  listByTenant(tenantId: string): Promise<Role[]>;
  create(role: Role): Promise<void>;
  update(role: Role): Promise<void>;
}
