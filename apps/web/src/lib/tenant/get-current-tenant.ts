import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { createServerContainer } from '@vl6/infra';
import type { Tenant, TenantBranding } from '@vl6/domain';
import { TENANT_HOST_HEADER } from '@/middleware';

export interface CurrentTenant {
  tenant: Tenant;
  branding: TenantBranding;
}

/**
 * Resolve o tenant da requisição atual a partir do host propagado pelo
 * middleware (docs/architecture/07-fluxo-autenticacao.md §7.1). Roda em
 * Node.js runtime (Server Component), onde o Admin SDK é suportado.
 * Envolto em `cache()` — chamado em `generateMetadata`, `generateViewport`,
 * no layout raiz e em praticamente toda página, então sem memoização cada
 * requisição faria a mesma leitura no Firestore várias vezes.
 */
export const getCurrentTenant = cache(async (): Promise<CurrentTenant | null> => {
  const headerList = await headers();
  const host = headerList.get(TENANT_HOST_HEADER) ?? headerList.get('host') ?? '';

  const container = createServerContainer();
  const tenantResult = await container.useCases.resolveTenantByHost.execute(host);
  if (!tenantResult.ok) {
    return null;
  }

  const branding = await container.repositories.tenantBranding.findByTenantId(
    tenantResult.value.id,
  );
  if (!branding) {
    return null;
  }

  return { tenant: tenantResult.value, branding };
});
