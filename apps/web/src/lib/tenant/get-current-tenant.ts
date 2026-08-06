import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { createServerContainer } from '@vl6/infra';
import type { Tenant, TenantBranding, TenantSettings } from '@vl6/domain';
import { DEFAULT_LOCALE, isLocale, PLATFORM_TENANT_ID, type Locale } from '@vl6/shared';
import { TENANT_HOST_HEADER } from '@/middleware';
import { getCurrentSession } from '@/lib/auth/get-current-session';

export interface CurrentTenant {
  tenant: Tenant;
  branding: TenantBranding;
  settings: TenantSettings | null;
  locale: Locale;
}

/**
 * Resolve o tenant da requisição atual. Primeiro tenta pelo host (domínio
 * próprio ou subdomínio da Loja — docs/architecture/07-fluxo-autenticacao.md
 * §7.1), o caminho normal pro site público e por quem tem domínio
 * configurado. Quando o host não resolve (ex.: domínio compartilhado/padrão
 * da Vercel, usado como portão de login unificado — §7.9), cai pra
 * resolver pela sessão autenticada: qualquer Irmão pode entrar por esse
 * portão e ainda assim ver a marca certa da própria Loja. Sem sessão
 * também, não há tenant nenhum pra resolver — `null` (ex.: visitante
 * anônimo na tela de login unificado).
 *
 * Roda em Node.js runtime (Server Component), onde o Admin SDK é
 * suportado. Envolto em `cache()` — chamado em `generateMetadata`,
 * `generateViewport`, no layout raiz e em praticamente toda página, então
 * sem memoização cada requisição faria a mesma leitura no Firestore várias
 * vezes.
 */
export const getCurrentTenant = cache(async (): Promise<CurrentTenant | null> => {
  const container = createServerContainer();
  const tenant = await resolveTenant(container);
  if (!tenant) {
    return null;
  }

  const [branding, settings] = await Promise.all([
    container.repositories.tenantBranding.findByTenantId(tenant.id),
    container.repositories.tenantSettings.findByTenantId(tenant.id),
  ]);
  if (!branding) {
    return null;
  }

  const locale = settings && isLocale(settings.idiomaPadrao) ? settings.idiomaPadrao : DEFAULT_LOCALE;

  return { tenant, branding, settings, locale };
});

async function resolveTenant(
  container: ReturnType<typeof createServerContainer>,
): Promise<Tenant | null> {
  const headerList = await headers();
  const host = headerList.get(TENANT_HOST_HEADER) ?? headerList.get('host') ?? '';

  const byHost = await container.useCases.resolveTenantByHost.execute(host);
  if (byHost.ok) {
    return byHost.value;
  }

  const session = await getCurrentSession();
  if (!session || session.authContext.tenantId === PLATFORM_TENANT_ID) {
    return null;
  }
  return container.repositories.tenant.findById(session.authContext.tenantId);
}
