import type { PermissionKey } from '@vl6/shared';
import type { Role } from '../entities/role.entity';
import type { User } from '../entities/user.entity';

export interface UserClaims {
  tenantId: string;
  roleId: string;
  permissions: PermissionKey[];
}

/**
 * Serviço de domínio puro — traduz `User` + `Role` nos Custom Claims que a
 * infraestrutura grava no Firebase Auth (docs/architecture/07-fluxo-
 * autenticacao.md §7.3). Não toca em nenhum SDK: apenas monta o objeto.
 */
export function computeUserClaims(user: User, role: Role): UserClaims {
  return {
    tenantId: user.tenantId,
    roleId: role.id,
    permissions: role.permissoes,
  };
}
