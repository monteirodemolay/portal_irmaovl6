'use client';

import { useState } from 'react';
import type { Event } from '@vl6/domain';
import { Badge, Button, MapPin, Share2 } from '@vl6/ui';
import { buildGoogleCalendarUrl, EVENT_KIND_LABELS } from '@vl6/shared';
import { AddToCalendarMenu } from '@/modules/dashboard/components/add-to-calendar-menu';
import { AgendaEventAttachments } from './agenda-event-attachments';
import { AgendaEventImportantInfo } from './agenda-event-important-info';
import { AgendaEventSummary } from './agenda-event-summary';

export function AgendaEventDetails({ event, isFeatured }: { event: Event; isFeatured: boolean }) {
  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-5">
      <p className="text-accent text-[10px] font-bold uppercase tracking-wide">
        Detalhes do evento
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {isFeatured && (
            <Badge variant="accent" className="mb-2">
              Próximo evento
            </Badge>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold">{event.titulo}</h1>
            <Badge className="bg-primary text-white">{EVENT_KIND_LABELS[event.tipo]}</Badge>
          </div>
          <p className="text-muted mt-2 flex items-center gap-1.5 text-xs">
            <MapPin size={13} strokeWidth={1.75} />
            {event.local}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <ShareEventButton event={event} />
          <AddToCalendarMenu
            eventId={event.id}
            titulo={event.titulo}
            googleCalendarUrl={buildGoogleCalendarUrl(event)}
          />
        </div>
      </div>

      <AgendaEventSummary event={event} />

      {event.descricao && (
        <section className="border-border border-b pb-6">
          <h3 className="text-muted mb-3 text-[10px] font-bold uppercase tracking-wide">
            Sobre o evento
          </h3>
          <p className="whitespace-pre-line text-sm leading-relaxed">{event.descricao}</p>
        </section>
      )}

      <section className="border-border border-b pb-6">
        <h3 className="text-muted mb-3 text-[10px] font-bold uppercase tracking-wide">
          Informações importantes
        </h3>
        <AgendaEventImportantInfo event={event} />
      </section>

      <section>
        <h3 className="text-muted mb-3 text-[10px] font-bold uppercase tracking-wide">
          Arquivos relacionados
        </h3>
        <AgendaEventAttachments eventId={event.id} />
      </section>
    </div>
  );
}

function ShareEventButton({ event }: { event: Event }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/eventos/${event.id}`;
    const text = `${event.titulo} — ${new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(event.dataInicio)}.`;

    if (navigator.share) {
      try {
        await navigator.share({ title: event.titulo, text, url });
      } catch {
        // Cancelado pelo usuário — sem erro a mostrar.
      }
      return;
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleShare}>
      <Share2 size={14} strokeWidth={1.75} />
      {copied ? 'Copiado!' : 'Compartilhar'}
    </Button>
  );
}
