import 'server-only';
import { redirect } from 'next/navigation';
import { getAreaTabs } from '@/components/layout/area-tab-nav';
import type { AdminAreaKey } from '@/components/layout/area-tabs';
import { requireSession } from './require-session';

/**
 * Usado pelo `page.tsx` de índice de cada área admin consolidada
 * (`/admin/pessoas`, `/admin/conteudo`, `/admin/acervo`,
 * `/admin/configuracoes`) — esses segmentos nunca renderizam conteúdo
 * próprio, só decidem pra qual aba a sessão atual deve cair. Diferente do
 * redirect de URL antiga (estático, em `next.config.ts`), este depende da
 * sessão: dois papéis customizados diferentes podem ter defaults diferentes
 * dentro da mesma área.
 */
export async function redirectToFirstVisibleTab(area: AdminAreaKey): Promise<never> {
  const session = await requireSession();
  const [firstTab] = getAreaTabs(area, session.authContext);
  redirect(firstTab?.href ?? '/admin');
}
