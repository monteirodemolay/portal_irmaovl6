import type { Event } from '@vl6/domain';
import { Badge, Button, Card, Clock, MapPin, Sparkles } from '@vl6/ui';
import { EVENT_KIND_LABELS } from '@vl6/shared';
import { AgendaOpenButton } from '@/modules/agenda/components/agenda-open-button';
import { formatEventDate } from '../lib/format-event-date';

/**
 * Card em destaque exclusivo do próximo Evento da Loja (curso, palestra,
 * confraternização, evento cívico etc.) — nunca recebe `tipo === 'sessao'`
 * (o chamador já filtra). Só mostra dados públicos de Evento (categoria,
 * capa, descrição), nunca grau ou pauta de Sessão — ver `NextSessionCard`
 * para o card equivalente da próxima Sessão.
 */
export function NextLodgeEventCard({ event }: { event: Event }) {
  const { day, month, weekday, weekdayShort, timeRange } = formatEventDate(
    event.dataInicio,
    event.dataFim,
  );
  const capaUrl = event.capaUrl ?? null;

  return (
    <Card className="relative flex flex-col gap-4 overflow-hidden p-6 text-white shadow-sm">
      <div
        className="from-primary to-primary-dark absolute inset-0 bg-gradient-to-br"
        aria-hidden="true"
      />
      {capaUrl && (
        <>
          <img src={capaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
        </>
      )}
      {!capaUrl && (
        <Sparkles
          size={140}
          strokeWidth={1}
          className="text-accent/10 pointer-events-none absolute -right-8 -top-8 z-[1]"
        />
      )}

      <p className="text-accent relative z-10 text-xs font-semibold uppercase tracking-widest">
        Próximo evento da Loja
      </p>

      <div className="relative z-10 flex items-start gap-4">
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
            {EVENT_KIND_LABELS[event.tipo]}
          </Badge>
          <p className="font-display mt-1.5 truncate text-lg font-semibold">{event.titulo}</p>
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-1.5 text-sm text-white/70">
        <p className="flex items-center gap-1.5">
          <Clock size={14} /> {weekday}, {timeRange}
        </p>
        <p className="flex items-center gap-1.5">
          <MapPin size={14} /> {event.local}
        </p>
      </div>

      {event.descricao && (
        <p className="relative z-10 line-clamp-2 text-sm text-white/60">{event.descricao}</p>
      )}

      <div className="relative z-10 mt-auto flex flex-wrap items-center gap-3 pt-1">
        <Button
          asChild
          size="sm"
          className="bg-accent text-primary-dark border-accent hover:bg-accent/90"
        >
          <AgendaOpenButton eventId={event.id}>Ver evento</AgendaOpenButton>
        </Button>
      </div>
    </Card>
  );
}
