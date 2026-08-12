import type { Role } from '@vl6/domain';
import { PLATFORM_TENANT_ID } from '@vl6/shared';

/**
 * Login unificado (mesma tela pra todo mundo — docs/architecture/07 §7.2),
 * mas o destino pós-login varia por papel, pra acabar com a confusão de
 * qual conta serve pra quê: Administrador Geral cai em `/plataforma`
 * (cross-tenant), Administrador da Loja (`admin`) cai em `/admin`, e Irmão
 * (`membro`) cai em `/dashboard`, a Área do Irmão. Papel customizado
 * (`sistemico: false`) segue uma regra mais simples: só tem sentido levar
 * pro `/admin` quem tem alguma permissão além de leitura (é o `/admin` que
 * expõe os formulários de criar/editar).
 */
export function resolvePostLoginDestination(tenantId: string, role: Role | null): string {
  if (tenantId === PLATFORM_TENANT_ID) {
    return '/plataforma';
  }
  if (!role) {
    return '/dashboard';
  }
  if (role.sistemico) {
    return role.chave === 'admin' ? '/admin' : '/dashboard';
  }

  const hasManagementPermission = role.permissoes.some((permission) => !permission.endsWith(':read'));
  return hasManagementPermission ? '/admin' : '/dashboard';
}
