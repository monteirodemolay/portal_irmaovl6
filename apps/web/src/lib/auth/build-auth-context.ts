import 'server-only';
import type { AuthContext } from '@vl6/domain';
import type { PermissionKey } from '@vl6/shared';
import type { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Traduz o token decodificado (Custom Claims — docs/architecture/07 §7.3)
 * no `AuthContext` que todo caso de uso do domínio exige. Usuário sem
 * claims ainda propagadas (ex.: instante entre criação da conta e a Cloud
 * Function de sync rodar) recebe um contexto sem permissões, nunca um erro.
 */
export function buildAuthContext(decoded: DecodedIdToken): AuthContext {
  return {
    uid: decoded.uid,
    tenantId: typeof decoded.tenantId === 'string' ? decoded.tenantId : '',
    roleId: typeof decoded.roleId === 'string' ? decoded.roleId : '',
    permissions: Array.isArray(decoded.permissions) ? (decoded.permissions as PermissionKey[]) : [],
  };
}
