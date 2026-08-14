import Link from 'next/link';
import type { Event } from '@vl6/domain';
import { Badge, CalendarDays, Card, Clock, MapPin } from '@vl6/ui';
import { EVENT_KIND_LABELS } from '@vl6/shared';
import { formatEventDate } from '../lib/format-event-date';
import { DashboardSectionHeading } from './dashboard-section-heading';

export function AgendaPanel({ events }: { events: Event[] }) {
  return (
    <Card className="flex flex-col gap-4 p-5 shadow-none">
      <DashboardSectionHeading
        icon={CalendarDays}
        title="Agenda"
        href="/agenda"
        hrefLabel="Ver agenda"
      />
      {events.length === 0 ? (
        <p className="text-muted text-sm">Nenhum outro evento programado.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => {
            const { day, month, timeRange } = formatEventDate(event.dataInicio, event.dataFim);
            return (
              <li key={event.id} className="flex gap-3">
                <div className="bg-primary flex w-12 shrink-0 flex-col items-center rounded py-1.5 text-white">
                  <span className="text-base font-bold leading-none">{day}</span>
                  <span className="text-accent text-[10px] leading-none">{month}</span>
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/eventos/${event.id}`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {event.titulo}
                  </Link>
                  <p className="text-muted flex items-center gap-1 text-xs">
                    <Clock size={12} /> {timeRange}
                    <Badge variant="outline" className="ml-1">
                      {EVENT_KIND_LABELS[event.tipo]}
                    </Badge>
                  </p>
                  <p className="text-muted flex items-center gap-1 text-xs">
                    <MapPin size={12} /> {event.local}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
