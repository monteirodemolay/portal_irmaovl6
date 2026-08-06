import type { Role } from '@vl6/domain';
import { PLATFORM_TENANT_ID, TENANT_SYSTEM_ROLE_KEYS, type RoleKey } from '@vl6/shared';

/**
 * Papéis de fábrica que são conteúdo/liderança operacional, não gestão da
 * Loja — ficam na Área do Irmão (`/dashboard`), não no painel `/admin`.
 * `comissao` entra aqui de propósito: mesmo tendo `event:create`/
 * `file:create` em algumas comissões, é papel de participante de grupo de
 * trabalho, não de liderança — mesma leitura de
 * docs/architecture/08-permissoes-rbac.md.
 */
const MEMBER_TIER_SYSTEM_ROLE_KEYS = new Set<RoleKey>(['irmao', 'visitante', 'comissao']);

/**
 * Login unificado (mesma tela pra todo mundo — docs/architecture/07 §7.2),
 * mas o destino pós-login varia por papel, pra acabar com a confusão de
 * qual conta serve pra quê: Administrador Geral cai em `/plataforma`
 * (cross-tenant), lideranças da Loja (Administrador, Venerável, Secretário,
 * Tesoureiro, Diretoria) caem em `/admin`, e o resto (Irmão, Comissão,
 * Visitante — "usuários finais") cai em `/dashboard`, a Área do Irmão.
 * Papel customizado (`sistemico: false`) segue uma regra mais simples: só
 * tem sentido levar pro `/admin` quem tem alguma permissão além de leitura
 * (é o `/admin` que expõe os formulários de criar/editar).
 */
export function resolvePostLoginDestination(tenantId: string, role: Role | null): string {
  if (tenantId === PLATFORM_TENANT_ID) {
    return '/plataforma';
  }
  if (!role) {
    return '/dashboard';
  }
  if (role.sistemico) {
    const isAdminTier =
      (TENANT_SYSTEM_ROLE_KEYS as readonly string[]).includes(role.chave) &&
      !MEMBER_TIER_SYSTEM_ROLE_KEYS.has(role.chave as RoleKey);
    return isAdminTier ? '/admin' : '/dashboard';
  }

  const hasManagementPermission = role.permissoes.some((permission) => !permission.endsWith(':read'));
  return hasManagementPermission ? '/admin' : '/dashboard';
}
