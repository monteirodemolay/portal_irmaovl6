'use client';

import { useEffect, useState } from 'react';
import type { Event } from '@vl6/domain';
import { Badge, Card, Clock, MapPin } from '@vl6/ui';
import { EVENT_KIND_LABELS } from '@vl6/shared';
import { AgendaOpenButton } from '@/modules/agenda/components/agenda-open-button';
import { formatEventDate } from '../lib/format-event-date';
import { DashboardSectionHeading } from './dashboard-section-heading';

const ROTATE_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Vitrine rotativa dos próximos Eventos que não são Sessão (curso,
 * palestra, confraternização, evento cívico etc.) — pedido do
 * Administrador: esses Eventos não tinham nenhum lugar de destaque no
 * Início (só apareciam misturados na lista "Agenda"), diferente das
 * Sessões da Loja, que já ganham o cartão de destaque de "Próximos da
 * Loja". Troca de Evento a cada 5 minutos — cadência baixa de propósito,
 * pra não piscar numa tela que a Loja pode deixar aberta num telão/monitor.
 */
export function EventsCarousel({ events }: { events: Event[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (events.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % events.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [events.length]);

  if (events.length === 0) return null;

  const event = events[index % events.length]!;
  const { day, month, weekday, timeRange } = formatEventDate(event.dataInicio, event.dataFim);

  return (
    <section className="flex flex-col gap-3">
      <DashboardSectionHeading
        icon={Clock}
        title="Eventos da Loja"
        action={
          <AgendaOpenButton className="text-accent shrink-0 text-xs font-medium hover:underline">
            Ver agenda
          </AgendaOpenButton>
        }
      />
      <Card className="flex flex-col gap-3 p-5 shadow-none sm:flex-row sm:items-center sm:gap-5">
        <div className="bg-primary flex w-16 shrink-0 flex-col items-center rounded-xl py-3 text-white">
          <span className="text-2xl font-bold leading-none">{day}</span>
          <span className="text-accent mt-1 text-[11px] font-semibold uppercase leading-none">
            {month}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <Badge variant="accent">{EVENT_KIND_LABELS[event.tipo]}</Badge>
          <AgendaOpenButton
            eventId={event.id}
            className="font-display mt-1.5 block truncate text-left text-base font-semibold hover:underline"
          >
            {event.titulo}
          </AgendaOpenButton>
          <p className="text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="flex items-center gap-1">
              <Clock size={12} /> {weekday}, {timeRange}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {event.local}
            </span>
          </p>
        </div>
        {events.length > 1 && (
          <div className="flex shrink-0 items-center gap-1.5 self-center sm:self-auto">
            {events.map((candidate, i) => (
              <span
                key={candidate.id}
                className={
                  i === index % events.length
                    ? 'bg-accent h-1.5 w-4 rounded-full transition-all'
                    : 'bg-border h-1.5 w-1.5 rounded-full transition-all'
                }
              />
            ))}
          </div>
        )}
      </Card>
    </section>
  );
}
