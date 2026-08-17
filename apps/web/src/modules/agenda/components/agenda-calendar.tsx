'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, cn } from '@vl6/ui';
import { useAgenda } from './agenda-provider';

const WEEKDAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA').format(date);
}

export function AgendaCalendar() {
  const { events, selectedEventId, openAgenda } = useAgenda();
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;

  const [displayedMonth, setDisplayedMonth] = useState(() => {
    const base = selectedEvent?.dataInicio ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // Só reage à troca do evento selecionado (não a `events`/`selectedEvent`,
  // que têm referência nova a cada render e forçariam o mês exibido a
  // "grudar" sempre no evento, impedindo a navegação livre pelo calendário).
  useEffect(() => {
    if (!selectedEvent) return;
    setDisplayedMonth(
      new Date(selectedEvent.dataInicio.getFullYear(), selectedEvent.dataInicio.getMonth(), 1),
    );
  }, [selectedEventId]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, string>();
    for (const event of events) {
      map.set(dateKey(event.dataInicio), event.id);
    }
    return map;
  }, [events]);

  const monthLabel = capitalize(
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(displayedMonth),
  );

  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<{ day: number; date: Date | null }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: 0, date: null });
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, date: new Date(year, month, day) });
  }
  while (cells.length % 7 !== 0) cells.push({ day: 0, date: null });

  return (
    <div className="border-border rounded-xl border bg-white p-4">
      <p className="text-muted mb-3.5 text-[10px] font-bold uppercase tracking-wide">Calendário</p>

      <div className="mb-3.5 grid grid-cols-[26px_1fr_26px] items-center">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => setDisplayedMonth(new Date(year, month - 1, 1))}
          className="text-muted hover:text-foreground"
        >
          <ChevronLeft size={16} />
        </button>
        <strong className="text-center text-xs">{monthLabel}</strong>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => setDisplayedMonth(new Date(year, month + 1, 1))}
          className="text-muted hover:text-foreground"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="text-muted mb-1 grid grid-cols-7 text-center text-[8px] font-bold">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, index) => {
          if (!cell.date) return <div key={`empty-${index}`} className="aspect-square" />;

          const key = dateKey(cell.date);
          const eventId = eventsByDay.get(key);
          const isSelected = eventId !== undefined && eventId === selectedEventId;

          return (
            <button
              key={key}
              type="button"
              disabled={!eventId}
              onClick={() => eventId && openAgenda(eventId)}
              className={cn(
                'relative m-0.5 flex aspect-square items-center justify-center rounded-full text-[10px]',
                isSelected
                  ? 'bg-accent font-bold text-white'
                  : eventId
                    ? 'hover:bg-accent/10 font-medium'
                    : 'text-muted cursor-default',
              )}
            >
              {cell.day}
              {eventId && !isSelected && (
                <span className="bg-primary absolute bottom-0.5 h-1 w-1 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      <div className="border-border text-muted mt-3 flex gap-4 border-t pt-3 text-[9px]">
        <span className="flex items-center gap-1.5">
          <span className="bg-accent h-2 w-2 rounded-full" /> Dia selecionado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-primary h-2 w-2 rounded-full" /> Com eventos
        </span>
      </div>
    </div>
  );
}
