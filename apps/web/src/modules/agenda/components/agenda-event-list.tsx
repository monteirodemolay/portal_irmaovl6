'use client';

import { useState } from 'react';
import { ChevronRight, cn, EmptyState } from '@vl6/ui';
import { formatEventDate } from '@/modules/dashboard/lib/format-event-date';
import { useAgenda } from './agenda-provider';

const INITIAL_VISIBLE_COUNT = 6;

export function AgendaEventList() {
  const { events, selectedEventId, openAgenda } = useAgenda();
  const [showAll, setShowAll] = useState(false);

  const visibleEvents = showAll ? events : events.slice(0, INITIAL_VISIBLE_COUNT);

  return (
    <div className="border-border flex flex-col overflow-hidden rounded-xl border bg-white">
      <p className="text-muted px-4 pb-2.5 pt-4 text-[10px] font-bold uppercase tracking-wide">
        Próximos eventos
      </p>

      {events.length === 0 ? (
        <div className="px-4 pb-4">
          <EmptyState title="Nenhum evento programado" />
        </div>
      ) : (
        <ul className="flex flex-col px-2.5 pb-2.5">
          {visibleEvents.map((event) => {
            const { day, month, weekdayShort } = formatEventDate(event.dataInicio, event.dataFim);
            const active = event.id === selectedEventId;
            return (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => openAgenda(event.id)}
                  className={cn(
                    'grid w-full grid-cols-[52px_minmax(0,1fr)_16px] items-center gap-2.5 rounded-lg px-2 py-2.5 text-left transition-colors',
                    active
                      ? 'border-accent/60 border bg-gradient-to-r from-[#fff8df] to-white'
                      : 'border border-transparent hover:bg-[#f9fafb]',
                  )}
                >
                  <div className="border-border/70 border-r text-center">
                    <p className="font-display text-xl font-semibold leading-none">{day}</p>
                    <p className="mt-1 text-[9px] font-bold leading-none text-amber-700">{month}</p>
                    <p className="text-muted mt-0.5 text-[9px] leading-none">{weekdayShort}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-muted text-[10px]">
                      {new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(
                        event.dataInicio,
                      )}
                    </p>
                    <p className="truncate text-xs font-semibold">{event.titulo}</p>
                    <p className="text-muted mt-0.5 truncate text-[10px]">{event.local}</p>
                  </div>
                  <ChevronRight size={13} className="text-muted" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {events.length > INITIAL_VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="border-border text-muted hover:text-foreground mx-2.5 mb-2.5 h-8 rounded-lg border text-xs font-semibold"
        >
          {showAll ? 'Ver menos' : 'Ver todos os eventos'}
        </button>
      )}
    </div>
  );
}
