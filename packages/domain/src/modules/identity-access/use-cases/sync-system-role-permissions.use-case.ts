import { DEFAULT_ROLE_PERMISSIONS, SYSTEM_ROLE_KEYS, type RoleKey } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ConflictError, NotFoundError, err, ok, type Result } from '../../../shared/result';
import type { Role } from '../entities/role.entity';
import type { IRoleRepository } from '../repositories/role.repository';

export interface SyncSystemRolePermissionsDeps {
  roleRepository: IRoleRepository;
  clock: IClock;
}

function isSystemRoleKey(chave: string): chave is RoleKey {
  return (SYSTEM_ROLE_KEYS as readonly string[]).includes(chave);
}

/**
 * Reaplica o seed de permissões (`DEFAULT_ROLE_PERMISSIONS`) a um papel
 * `sistemico = true` já existente. Necessário porque o seed só é consultado
 * na criação do tenant (`CreateTenantUseCase`) — quando o vocabulário de
 * permissões ganha uma chave nova (ex.: `memberCentral:update`, adicionado
 * com a Central VL6), papéis de tenants já existentes não a recebem
 * automaticamente. Não mexe em papéis customizados (`sistemico = false`),
 * que são dado do tenant, não seed do sistema.
 */
export class SyncSystemRolePermissionsUseCase {
  constructor(private readonly deps: SyncSystemRolePermissionsDeps) {}

  async execute(ctx: AuthContext, roleId: string): Promise<Result<Role>> {
    requirePermission(ctx, 'role:manage');

    const role = await this.deps.roleRepository.findById(roleId);
    if (!role || role.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Role', roleId));
    }
    if (!role.sistemico || !isSystemRoleKey(role.chave)) {
      return err(new ConflictError('Só papéis do sistema podem ser sincronizados com o padrão.'));
    }

    const updated: Role = {
      ...role,
      permissoes: DEFAULT_ROLE_PERMISSIONS[role.chave],
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.roleRepository.update(updated);

    return ok(updated);
  }
}
