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
} from '@vl6/ui';
import { AgendaCalendar } from './agenda-calendar';
import { AgendaEventDetails } from './agenda-event-details';
import { AgendaEventList } from './agenda-event-list';
import { useAgenda } from './agenda-provider';

export function AgendaDrawer() {
  const { isOpen, selectedEventId, events, canManageEvents, closeAgenda } = useAgenda();
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && closeAgenda()}>
      <DrawerContent className="w-full max-w-none rounded-l-none sm:w-[92vw] sm:rounded-l-3xl lg:w-[78vw] lg:max-w-[1160px]">
        <header className="border-border flex min-h-[88px] items-center justify-between gap-4 border-b bg-white py-4 pl-5 pr-14 sm:pl-7 sm:pr-16">
          <div className="min-w-0">
            <DrawerTitle className="font-display truncate text-xl sm:text-2xl">
              Agenda da Loja
            </DrawerTitle>
            <DrawerDescription className="mt-1 truncate text-xs">
              Acompanhe os eventos e sessões da Loja
            </DrawerDescription>
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

        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto bg-[#f8f9fb] p-3.5 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:overflow-hidden">
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto lg:overflow-y-auto">
            <AgendaEventList />
            <AgendaCalendar />
          </div>

          <div className="border-border min-h-0 shrink-0 overflow-y-auto rounded-xl border bg-white lg:overflow-y-auto">
            {selectedEvent ? (
              <AgendaEventDetails
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
      </DrawerContent>
    </Drawer>
  );
}
