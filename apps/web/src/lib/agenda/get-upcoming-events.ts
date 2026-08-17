import 'server-only';
import { cache } from 'react';
import type { Event } from '@vl6/domain';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { getCurrentSession } from '@/lib/auth/get-current-session';

const AGENDA_DRAWER_EVENT_LIMIT = 60;

/**
 * Eventos futuros usados tanto pelo drawer global da Agenda (lista +
 * calendário) quanto pelos cards de "Próximos da Loja" do Início —
 * `cache()` (React) garante uma única leitura no Firestore por
 * requisição mesmo chamado de mais de um Server Component, mesmo padrão
 * de `getCurrentTenant()`.
 */
export const getUpcomingEventsForPortal = cache(async (): Promise<Event[]> => {
  const session = await getCurrentSession();
  if (!session || !hasPermission(session.authContext, 'event:read')) return [];

  const container = createServerContainer();
  const page = await container.useCases.listUpcomingEvents.execute(session.authContext, {
    limit: AGENDA_DRAWER_EVENT_LIMIT,
  });
  return page.items;
});
