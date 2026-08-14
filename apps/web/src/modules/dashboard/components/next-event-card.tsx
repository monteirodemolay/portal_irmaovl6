import Link from 'next/link';
import type { Event } from '@vl6/domain';
import { Badge, Card, Clock, MapPin } from '@vl6/ui';
import { buildGoogleCalendarUrl, EVENT_KIND_LABELS } from '@vl6/shared';
import { formatEventDate } from '../lib/format-event-date';
import { AddToCalendarMenu } from './add-to-calendar-menu';

export function NextEventCard({ event }: { event: Event }) {
  const { day, month, weekday, timeRange } = formatEventDate(event.dataInicio, event.dataFim);
  const googleCalendarUrl = buildGoogleCalendarUrl(event);

  return (
    <Card className="border-accent/40 flex flex-col gap-4 p-5 shadow-none">
      <div className="flex items-center gap-3">
        <div className="bg-primary flex w-14 shrink-0 flex-col items-center rounded-lg py-2 text-white">
          <span className="text-xl font-bold leading-none">{day}</span>
          <span className="text-accent mt-1 text-[10px] leading-none">{month}</span>
        </div>
        <div className="min-w-0">
          <Badge variant="accent">Próximo evento</Badge>
          <p className="font-display mt-1 truncate text-base font-semibold">{event.titulo}</p>
        </div>
      </div>

      <div className="text-muted flex flex-col gap-1.5 text-sm">
        <p className="flex items-center gap-1.5">
          <Clock size={14} /> {weekday}, {timeRange}
        </p>
        <p className="flex items-center gap-1.5">
          <MapPin size={14} /> {event.local}
        </p>
        <Badge variant="outline" className="w-fit">
          {EVENT_KIND_LABELS[event.tipo]}
        </Badge>
      </div>

      {event.descricao && <p className="text-muted line-clamp-2 text-sm">{event.descricao}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
        <AddToCalendarMenu
          eventId={event.id}
          titulo={event.titulo}
          googleCalendarUrl={googleCalendarUrl}
        />
        <Link
          href={`/eventos/${event.id}`}
          className="text-accent text-xs font-medium hover:underline"
        >
          Ver detalhes
        </Link>
      </div>
    </Card>
  );
}
