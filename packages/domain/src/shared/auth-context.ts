import { PLATFORM_TENANT_ID, type PermissionKey } from '@vl6/shared';
import { ForbiddenError } from './result';

/**
 * Identidade resolvida da sessão autenticada — construída pela camada de
 * apresentação a partir dos Custom Claims (ver docs/architecture/07) e
 * passada explicitamente a todo caso de uso. `tenantId` nunca vem de um
 * parâmetro de formulário (docs/architecture/06 §6.9): é sempre este campo.
 */
export interface AuthContext {
  readonly uid: string;
  readonly tenantId: string;
  readonly roleId: string;
  readonly permissions: readonly PermissionKey[];
}

export function hasPermission(ctx: AuthContext, permission: PermissionKey): boolean {
  const [resource] = permission.split(':');
  return (
    ctx.permissions.includes(permission) ||
    ctx.permissions.includes(`${resource}:manage` as PermissionKey)
  );
}

/** Lança `ForbiddenError` se a sessão não possuir a permissão — uso no topo de todo caso de uso de escrita. */
export function requirePermission(ctx: AuthContext, permission: PermissionKey): void {
  if (!hasPermission(ctx, permission)) {
    throw new ForbiddenError(permission);
  }
}

/**
 * Lança `ForbiddenError` se a sessão não for do Administrador Geral
 * (`super_admin`, docs/architecture/08 §8.3). Usado em vez de
 * `requirePermission` para ações genuinamente cross-tenant (criar Loja,
 * bootstrap do próprio Admin Geral): `tenant:manage` — que todo
 * Administrador de Loja tem — já implica `tenant:create` em
 * `hasPermission` (regra de "manage implica todas as ações do recurso"),
 * então checar a permissão sozinha deixaria qualquer Administrador de Loja
 * criar novas Lojas. `tenantId` vem de Custom Claims (só o Admin SDK
 * grava), então não é forjável pelo client.
 */
export function requirePlatformAdmin(ctx: AuthContext): void {
  if (ctx.tenantId !== PLATFORM_TENANT_ID) {
    throw new ForbiddenError('platform:admin');
  }
}
