import type { Event } from '@vl6/domain';
import { CalendarDays, Clock, Landmark } from '@vl6/ui';
import { formatEventDate } from '@/modules/dashboard/lib/format-event-date';

export function AgendaEventSummary({ event }: { event: Event }) {
  const { day, month, weekday, timeRange } = formatEventDate(event.dataInicio, event.dataFim);
  const durationLabel = event.dataFim
    ? formatDuration(event.dataFim.getTime() - event.dataInicio.getTime())
    : null;

  const items = [
    {
      icon: CalendarDays,
      label: 'Data',
      value: `${day} de ${month.toLowerCase()}`,
      sub: weekday,
    },
    {
      icon: Clock,
      label: 'Horário',
      value: timeRange,
      sub: durationLabel ? `Duração: ${durationLabel}` : null,
    },
    {
      icon: Landmark,
      label: 'Local',
      value: event.local,
      sub: null,
    },
  ];

  return (
    <div className="from-primary to-primary-dark grid grid-cols-1 overflow-hidden rounded-xl bg-gradient-to-br text-white sm:grid-cols-3">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={
            index < items.length - 1
              ? 'border-b border-white/10 p-5 last:border-0 sm:border-b-0 sm:border-r'
              : 'p-5'
          }
        >
          <div className="flex items-start gap-2.5">
            <item.icon size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-white/70" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/60">
                {item.label}
              </p>
              <p className="mt-1 truncate text-sm font-semibold">{item.value}</p>
              {item.sub && <p className="text-accent mt-0.5 text-xs">{item.sub}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDuration(durationMs: number): string {
  const totalMinutes = Math.round(durationMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${minutes}`;
}
