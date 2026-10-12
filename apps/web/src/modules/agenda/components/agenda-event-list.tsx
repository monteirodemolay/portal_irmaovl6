'use client';

import { ChevronRight, Clock, MapPin, cn, EmptyState } from '@vl6/ui';
import { formatEventDate } from '@/modules/dashboard/lib/format-event-date';
import { useAgenda } from './agenda-provider';

const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});

export function AgendaEventList() {
  const { filteredEvents: events, selectedEventId, scope, openAgenda } = useAgenda();
  const onlySessions = scope === 'sessions';
  const groups = new Map<string, typeof events>();
  for (const event of events) {
    const month = monthFormatter.format(event.dataInicio);
    const group = groups.get(month) ?? [];
    group.push(event);
    groups.set(month, group);
  }

  return (
    <section className="border-border bg-surface flex shrink-0 flex-col rounded-xl border p-4">
      <div className="text-muted mb-4 flex items-center justify-between gap-3 text-xs">
        <h3 className="font-semibold">
          {onlySessions
            ? 'Todas as próximas sessões'
            : scope === 'events'
              ? 'Todos os próximos eventos'
              : 'Programação futura'}
        </h3>
        <span>{events.length} compromisso(s)</span>
      </div>
      {events.length === 0 ? (
        <EmptyState
          title={onlySessions ? 'Nenhuma sessão programada' : 'Nenhum evento programado'}
          description="Novos compromissos aparecerão aqui assim que forem cadastrados na Agenda."
        />
      ) : (
        Array.from(groups, ([month, items]) => (
          <div key={month} className="mb-4 last:mb-0">
            <h4 className="text-accent border-border mb-2 border-b pb-2 text-xs font-semibold capitalize">
              {month}
            </h4>
            <ul className="flex flex-col gap-1">
              {items.map((event) => {
                const {
                  day,
                  month: shortMonth,
                  timeRange,
                } = formatEventDate(event.dataInicio, event.dataFim);
                const active = event.id === selectedEventId;
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => openAgenda(event.id)}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'grid w-full grid-cols-[52px_minmax(0,1fr)_16px] items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors',
                        active ? 'bg-accent/15' : 'hover:bg-background',
                      )}
                    >
                      <span className="bg-primary flex min-h-[66px] flex-col items-center justify-center rounded-xl text-white">
                        <span className="text-xl font-semibold leading-none">{day}</span>
                        <span className="mt-1 text-[11px] font-medium text-amber-200">
                          {shortMonth}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-semibold">
                          {event.titulo}
                        </span>
                        <span className="text-muted mt-1 flex items-center gap-1.5 text-xs">
                          <Clock size={12} className="shrink-0" />
                          {timeRange}
                        </span>
                        <span className="text-muted mt-1 flex items-start gap-1.5 text-xs">
                          <MapPin size={12} className="mt-0.5 shrink-0" />
                          <span className="break-words">{event.local}</span>
                        </span>
                      </span>
                      <ChevronRight size={16} className="text-muted" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
