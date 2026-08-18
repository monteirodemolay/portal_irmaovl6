'use client';

import { Badge, Button, CalendarDays, Card, Clock, MapPin } from '@vl6/ui';
import { EVENT_KIND_LABELS } from '@vl6/shared';
import { formatEventDate } from '@/modules/dashboard/lib/format-event-date';
import { useAgendaOptional } from './agenda-provider';

/** Atalho lateral pra abrir o drawer institucional da Agenda — não duplica nada dele, só é outra porta de entrada. */
export function StoreAgendaQuickCard() {
  const agenda = useAgendaOptional();
  if (!agenda) return null;

  const nextEvent = agenda.events[0] ?? null;

  if (!nextEvent) {
    return (
      <Card className="flex flex-col gap-3 p-4">
        <p className="text-muted text-sm">
          Sessões e eventos oficiais, com anexos e confirmação de presença.
        </p>
        <Button variant="outline" size="sm" className="w-fit" onClick={() => agenda.openAgenda()}>
          Abrir agenda completa
        </Button>
      </Card>
    );
  }

  const { day, month, weekday, timeRange } = formatEventDate(
    nextEvent.dataInicio,
    nextEvent.dataFim,
  );

  return (
    <Card className="from-primary to-primary-dark relative flex flex-col gap-3 overflow-hidden bg-gradient-to-br p-4 text-white shadow-sm">
      <CalendarDays
        size={100}
        strokeWidth={1}
        className="text-accent/10 pointer-events-none absolute -right-6 -top-6"
      />

      <p className="text-accent relative text-[11px] font-semibold uppercase tracking-widest">
        Agenda de sessões da Loja
      </p>

      <div className="relative flex items-start gap-3">
        <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-white/10 py-2 ring-1 ring-white/15">
          <span className="text-lg font-bold leading-none">{day}</span>
          <span className="text-accent mt-1 text-[9px] font-semibold uppercase leading-none">
            {month}
          </span>
        </div>
        <div className="min-w-0 pt-0.5">
          <Badge variant="accent" className="bg-accent text-primary-dark">
            Próximo evento
          </Badge>
          <p className="font-display mt-1.5 truncate text-sm font-semibold">{nextEvent.titulo}</p>
          <Badge variant="outline" className="mt-1.5 border-white/25 text-white/80">
            {EVENT_KIND_LABELS[nextEvent.tipo]}
          </Badge>
        </div>
      </div>

      <div className="relative flex flex-col gap-1 text-xs text-white/70">
        <p className="flex items-center gap-1.5">
          <Clock size={12} /> {weekday}, {timeRange}
        </p>
        <p className="flex items-center gap-1.5">
          <MapPin size={12} /> {nextEvent.local}
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="relative w-fit border-white/30 text-white hover:bg-white/10"
        onClick={() => agenda.openAgenda()}
      >
        Abrir agenda completa
      </Button>
    </Card>
  );
}
