import type { Event } from '@vl6/domain';

/** A coleção abre em ordem cronológica, sem depender do último item consultado. */
export function selectAgendaEvents(events: Event[], scope?: 'sessions' | 'events'): Event[] {
  return events
    .filter((event) =>
      scope === 'sessions'
        ? event.tipo === 'sessao'
        : scope === 'events'
          ? event.tipo !== 'sessao'
          : true,
    )
    .sort((a, b) => a.dataInicio.getTime() - b.dataInicio.getTime() || a.id.localeCompare(b.id));
}
