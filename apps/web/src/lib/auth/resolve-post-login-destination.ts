import type { Role } from '@vl6/domain';
import { PLATFORM_TENANT_ID } from '@vl6/shared';
import { isAdminTier } from './is-admin-tier';

/**
 * Login unificado (mesma tela pra todo mundo — docs/architecture/07 §7.2),
 * mas o destino pós-login varia por papel, pra acabar com a confusão de
 * qual conta serve pra quê: Administrador Geral cai em `/plataforma`
 * (cross-tenant), Administrador da Loja (`admin`) cai em `/admin`, e Irmão
 * (`membro`) cai em `/dashboard`, a Área do Irmão. Mesmo critério de
 * `isAdminTier` usado pelo gate de `/admin/*` e pela sidebar — evita as
 * duas regras divergirem com o tempo.
 */
export function resolvePostLoginDestination(tenantId: string, role: Role | null): string {
  if (tenantId === PLATFORM_TENANT_ID) {
    return '/plataforma';
  }
  return isAdminTier(role) ? '/admin' : '/dashboard';
}
