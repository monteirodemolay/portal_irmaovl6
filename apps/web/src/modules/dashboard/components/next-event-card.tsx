import Link from 'next/link';
import type { Event } from '@vl6/domain';
import { Badge, Button, CalendarDays, Card, Clock, MapPin } from '@vl6/ui';
import { buildGoogleCalendarUrl, EVENT_KIND_LABELS } from '@vl6/shared';
import { formatEventDate } from '../lib/format-event-date';
import { AddToCalendarMenu } from './add-to-calendar-menu';

export function NextEventCard({ event }: { event: Event }) {
  const { day, month, weekday, weekdayShort, timeRange } = formatEventDate(
    event.dataInicio,
    event.dataFim,
  );
  const googleCalendarUrl = buildGoogleCalendarUrl(event);

  return (
    <Card className="from-primary to-primary-dark relative flex flex-col gap-4 overflow-hidden bg-gradient-to-br p-6 text-white shadow-sm">
      <CalendarDays
        size={140}
        strokeWidth={1}
        className="text-accent/10 pointer-events-none absolute -right-8 -top-8"
      />

      <p className="text-accent relative text-xs font-semibold uppercase tracking-widest">
        Agenda de sessões da Loja
      </p>

      <div className="relative flex items-start gap-4">
        <div className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-white/10 py-3 ring-1 ring-white/15">
          <span className="text-2xl font-bold leading-none">{day}</span>
          <span className="text-accent mt-1 text-[11px] font-semibold uppercase leading-none">
            {month}
          </span>
          <span className="mt-1 text-[10px] uppercase leading-none text-white/50">
            {weekdayShort}
          </span>
        </div>
        <div className="min-w-0 pt-1">
          <Badge variant="accent" className="bg-accent text-primary-dark">
            Próximo evento
          </Badge>
          <p className="font-display mt-1.5 truncate text-lg font-semibold">{event.titulo}</p>
          <Badge variant="outline" className="mt-1.5 border-white/25 text-white/80">
            {EVENT_KIND_LABELS[event.tipo]}
          </Badge>
        </div>
      </div>

      <div className="relative flex flex-col gap-1.5 text-sm text-white/70">
        <p className="flex items-center gap-1.5">
          <Clock size={14} /> {weekday}, {timeRange}
        </p>
        <p className="flex items-center gap-1.5">
          <MapPin size={14} /> {event.local}
        </p>
      </div>

      {event.descricao && (
        <p className="relative line-clamp-2 text-sm text-white/60">{event.descricao}</p>
      )}

      <div className="relative mt-auto flex flex-wrap items-center gap-3 pt-1">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="border-white/30 text-white hover:bg-white/10"
        >
          <Link href={`/eventos/${event.id}`}>Ver detalhes</Link>
        </Button>
        <AddToCalendarMenu
          eventId={event.id}
          titulo={event.titulo}
          googleCalendarUrl={googleCalendarUrl}
        />
      </div>
    </Card>
  );
}
