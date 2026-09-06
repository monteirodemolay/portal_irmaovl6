'use client';

import { useState } from 'react';
import { ChevronRight, cn, EmptyState } from '@vl6/ui';
import { formatEventDate } from '@/modules/dashboard/lib/format-event-date';
import { useAgenda } from './agenda-provider';

const INITIAL_VISIBLE_COUNT = 6;

export function AgendaEventList() {
  const { filteredEvents: events, selectedEventId, onlySessions, openAgenda } = useAgenda();
  const [showAll, setShowAll] = useState(false);

  const visibleEvents = showAll ? events : events.slice(0, INITIAL_VISIBLE_COUNT);

  return (
    // `shrink-0` é essencial aqui: como este card usa `overflow-hidden` (só
    // pra manter os cantos arredondados), o flexbox trata sua altura mínima
    // automática como 0 (spec: item com overflow não-visível não protege
    // conteúdo do encolhimento) — sem isso, a coluna da esquerda do drawer
    // (flex-col com `AgendaCalendar` logo abaixo) espremia esta lista até
    // sobrar só 1 evento visível, cortado, mesmo com várias Sessões
    // futuras cadastradas (achado do Administrador: "os outros eventos
    // ficam escondidos").
    <div className="border-border flex shrink-0 flex-col overflow-hidden rounded-xl border bg-white">
      <p className="text-muted px-4 pb-2.5 pt-4 text-[10px] font-bold uppercase tracking-wide">
        {onlySessions ? 'Próximas sessões' : 'Próximos eventos'}
      </p>

      {events.length === 0 ? (
        <div className="px-4 pb-4">
          <EmptyState
            title={onlySessions ? 'Nenhuma sessão programada' : 'Nenhum evento programado'}
          />
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
