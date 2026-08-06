import 'server-only';
import { notFound } from 'next/navigation';
import { PLATFORM_TENANT_ID } from '@vl6/shared';
import { requireSession } from './require-session';
import type { CurrentSession } from './get-current-session';

/**
 * Gate das rotas /plataforma (Administrador Geral, docs/architecture/08
 * §8.3). Não usa `requirePagePermission('tenant:create')`: `tenant:manage`
 * — que todo Administrador de Loja tem — implica `tenant:create` em
 * `hasPermission` (regra "manage implica todas as ações"), o que deixaria
 * qualquer Administrador de Loja entrar aqui. `tenantId` vem de Custom
 * Claims gravadas só pelo Admin SDK — não forjável pelo client.
 */
export async function requirePlatformAdmin(): Promise<CurrentSession> {
  const session = await requireSession();
  if (session.authContext.tenantId !== PLATFORM_TENANT_ID) {
    notFound();
  }
  return session;
}
