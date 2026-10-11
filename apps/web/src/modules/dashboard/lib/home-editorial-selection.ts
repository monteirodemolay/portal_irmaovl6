import type { Announcement, Event } from '@vl6/domain';

export const HOME_NEWS_LIMIT = 3;
export const HOME_EVENTS_PER_TYPE = 3;
export const HOME_ANNOUNCEMENT_LIMIT = 2;

/** Mesma seleção na vitrine do Irmão e na conferência administrativa da Ficha. */
export function selectHomeEvents(events: Event[]) {
  const enabled = events.filter((event) => event.exibirNaTelaInicial !== false);
  return {
    sessions: enabled.filter((event) => event.tipo === 'sessao').slice(0, HOME_EVENTS_PER_TYPE),
    events: enabled.filter((event) => event.tipo !== 'sessao').slice(0, HOME_EVENTS_PER_TYPE),
  };
}

export function sortHomeAnnouncements(announcements: Announcement[]): Announcement[] {
  const priority = { alta: 0, media: 1, baixa: 2 };
  return [...announcements].sort(
    (a, b) =>
      Number(b.destacar) - Number(a.destacar) || priority[a.prioridade] - priority[b.prioridade],
  );
}
