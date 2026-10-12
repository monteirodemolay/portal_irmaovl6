'use client';

import Link from 'next/link';
import {
  CalendarDays,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  EmptyState,
  Plus,
  Button,
  ArrowLeft,
  ChevronRight,
} from '@vl6/ui';
import { AgendaCalendar } from './agenda-calendar';
import { AgendaEventDetails } from './agenda-event-details';
import { AgendaEventList } from './agenda-event-list';
import { useAgenda } from './agenda-provider';

export function AgendaDrawer() {
  const {
    isOpen,
    selectedEventId,
    filteredEvents: events,
    canManageEvents,
    scope,
    closeAgenda,
    openAgenda,
  } = useAgenda();
  const selectedIndex = events.findIndex((event) => event.id === selectedEventId);
  const selectedEvent = events[selectedIndex] ?? null;
  const title =
    scope === 'sessions'
      ? 'Próximas sessões'
      : scope === 'events'
        ? 'Próximos eventos'
        : 'Agenda da Loja';
  const description =
    scope === 'sessions'
      ? 'Acompanhe as próximas sessões da Loja'
      : scope === 'events'
        ? 'Acompanhe os próximos eventos da Loja'
        : 'Acompanhe os eventos e sessões da Loja';

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && closeAgenda()}>
      <DrawerContent
        className={
          scope
            ? 'w-full max-w-2xl sm:rounded-l-3xl'
            : 'w-full max-w-none rounded-l-none sm:w-[92vw] sm:rounded-l-3xl lg:w-[78vw] lg:max-w-[1160px]'
        }
      >
        <header className="border-border flex min-h-[88px] items-center justify-between gap-4 border-b bg-white py-4 pl-5 pr-14 sm:pl-7 sm:pr-16">
          <div className="min-w-0">
            <DrawerTitle className="font-display truncate text-xl sm:text-2xl">{title}</DrawerTitle>
            <DrawerDescription className="mt-1 truncate text-xs">{description}</DrawerDescription>
          </div>

          {canManageEvents && (
            <Link
              href="/admin/conteudo/agenda/novo"
              className="bg-primary hover:bg-primary-dark hidden h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-xs font-bold text-white transition-colors sm:flex"
            >
              <Plus size={14} strokeWidth={2} />
              Novo evento
            </Link>
          )}
        </header>

        {scope ? (
          <>
            <div
              key={selectedEventId ?? scope}
              className="bg-background min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"
            >
              {selectedEvent ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openAgenda(undefined, { scope })}
                    className="mb-4"
                  >
                    <ArrowLeft size={16} /> Voltar à lista
                  </Button>
                  <div className="border-border bg-surface rounded-xl border">
                    <AgendaEventDetails
                      key={selectedEvent.id}
                      event={selectedEvent}
                      isFeatured={selectedIndex === 0}
                    />
                  </div>
                </>
              ) : (
                <AgendaEventList />
              )}
            </div>
            <footer className="border-border bg-surface flex flex-wrap items-center justify-between gap-3 border-t p-4 sm:px-6">
              {selectedEvent ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={selectedIndex <= 0}
                    onClick={() => openAgenda(events[selectedIndex - 1]?.id)}
                  >
                    <ArrowLeft size={16} /> Anterior
                  </Button>
                  <span className="text-muted text-xs" aria-live="polite">
                    {selectedIndex + 1} de {events.length}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={selectedIndex >= events.length - 1}
                    onClick={() => openAgenda(events[selectedIndex + 1]?.id)}
                  >
                    Próximo <ChevronRight size={16} />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-muted text-xs">
                    {events.length} {scope === 'sessions' ? 'sessão(ões)' : 'evento(s)'} na
                    programação futura
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={closeAgenda}>
                    Voltar à página
                  </Button>
                </>
              )}
            </footer>
          </>
        ) : (
          <div className="bg-background flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-3.5 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:overflow-hidden">
            <div className="flex min-h-0 flex-col gap-3 overflow-y-auto lg:overflow-y-auto">
              <AgendaEventList />
              <AgendaCalendar />
            </div>

            <div className="border-border min-h-0 shrink-0 overflow-y-auto rounded-xl border bg-white lg:overflow-y-auto">
              {selectedEvent ? (
                <AgendaEventDetails
                  key={selectedEvent.id}
                  event={selectedEvent}
                  isFeatured={selectedEvent.id === events[0]?.id}
                />
              ) : (
                <div className="p-8">
                  <EmptyState
                    icon={<CalendarDays size={22} />}
                    title="Nenhum evento selecionado"
                    description="Escolha um evento na lista ou no calendário ao lado."
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
