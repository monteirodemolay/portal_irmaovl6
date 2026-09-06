'use client';

import { useEffect, useState } from 'react';
import type { Event } from '@vl6/domain';
import { Badge, Card, Clock, cn, EmptyState, MapPin, Sparkles } from '@vl6/ui';
import { EVENT_KIND_LABELS } from '@vl6/shared';
import { AgendaOpenButton } from '@/modules/agenda/components/agenda-open-button';
import { formatEventDate } from '../lib/format-event-date';
import { DashboardSectionHeading } from './dashboard-section-heading';

const ROTATE_INTERVAL_MS = 5 * 60 * 1000;
const FADE_MS = 300;

/**
 * Vitrine dos próximos Eventos que não são Sessão (curso, palestra,
 * confraternização, evento cívico etc.) — pedido do Administrador: um
 * banner quadrado próprio, no estilo dos Stories do Instagram (barra
 * segmentada indicando qual Evento está em exibição), separado das
 * Sessões da Loja pra não competir visualmente com elas. Troca de Evento
 * a cada 5 minutos em cross-fade — cadência baixa de propósito, pra não
 * piscar numa tela que a Loja pode deixar aberta num telão/monitor.
 * Quando o Evento tem `capaUrl` (upload 1:1 no formulário de Evento), ela
 * entra como plano de fundo com um degradê escuro por cima pra manter o
 * texto legível; sem capa, mantém o fallback em gradiente sólido — nunca
 * perde nenhuma das informações do Evento.
 */
export function EventsCarousel({ events }: { events: Event[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (events.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      const swap = setTimeout(() => {
        setIndex((current) => (current + 1) % events.length);
        setVisible(true);
      }, FADE_MS);
      return () => clearTimeout(swap);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [events.length]);

  return (
    <section className="flex flex-col gap-3">
      <DashboardSectionHeading
        icon={Sparkles}
        title="Eventos da Loja"
        action={
          <AgendaOpenButton className="text-accent shrink-0 text-xs font-medium hover:underline">
            Ver agenda
          </AgendaOpenButton>
        }
      />
      {events.length === 0 ? (
        <Card className="shadow-none">
          <EmptyState
            icon={<Sparkles size={22} />}
            title="Nenhum evento programado"
            description="Cursos, palestras e confraternizações aparecem aqui assim que forem cadastrados na Agenda."
          />
        </Card>
      ) : (
        <EventSquareBanner
          event={events[index % events.length]!}
          total={events.length}
          current={index % events.length}
          visible={visible}
        />
      )}
    </section>
  );
}

function EventSquareBanner({
  event,
  total,
  current,
  visible,
}: {
  event: Event;
  total: number;
  current: number;
  visible: boolean;
}) {
  const { weekday, timeRange } = formatEventDate(event.dataInicio, event.dataFim);
  const capaUrl = event.capaUrl ?? null;

  return (
    <AgendaOpenButton
      eventId={event.id}
      className={cn(
        'focus-visible:ring-accent relative block aspect-square w-full overflow-hidden rounded-2xl text-left text-white shadow-sm outline-none transition-opacity focus-visible:ring-2',
        capaUrl ? 'bg-primary-dark' : 'from-primary to-primary-dark bg-gradient-to-br',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      {capaUrl && (
        <img src={capaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      {capaUrl && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
      )}
      {total > 1 && (
        <div className="absolute inset-x-3 top-3 z-10 flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-[3px] flex-1 rounded-full transition-colors',
                i === current ? 'bg-accent' : 'bg-white/30',
              )}
            />
          ))}
        </div>
      )}
      {!capaUrl && (
        <Sparkles
          size={220}
          strokeWidth={1}
          className="text-accent/10 pointer-events-none absolute -bottom-12 -right-12"
        />
      )}
      <div className="relative flex h-full flex-col justify-end p-6">
        <Badge variant="accent" className="bg-accent text-primary-dark w-fit">
          {EVENT_KIND_LABELS[event.tipo]}
        </Badge>
        <p className="font-display mt-2.5 text-xl font-semibold leading-tight">{event.titulo}</p>
        <div className="mt-2 flex flex-col gap-1 text-xs text-white/70">
          <span className="flex items-center gap-1.5">
            <Clock size={12} /> {weekday}, {timeRange}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin size={12} /> {event.local}
          </span>
        </div>
      </div>
    </AgendaOpenButton>
  );
}
