import { PLATFORM_TENANT_ID } from '@vl6/shared';

/**
 * Login unificado (mesma tela pra todo mundo — docs/architecture/07 §7.2):
 * todo mundo cai na Área do Irmão (`/dashboard`), que já dá acesso rápido
 * ao painel administrativo pra quem tem permissão — sem redirecionamento
 * por papel. Única exceção é o Administrador Geral (`tenantId === platform`,
 * cross-tenant), que não tem Área do Irmão nenhuma pra cair — vai direto
 * pro painel `/plataforma`.
 */
export function resolvePostLoginDestination(tenantId: string): string {
  return tenantId === PLATFORM_TENANT_ID ? '/plataforma' : '/dashboard';
}
