'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Event } from '@vl6/domain';
import { AgendaDrawer } from './agenda-drawer';

export interface AgendaContextValue {
  isOpen: boolean;
  selectedEventId: string | null;
  events: Event[];
  canManageEvents: boolean;
  openAgenda: (eventId?: string) => void;
  closeAgenda: () => void;
}

const AgendaContext = createContext<AgendaContextValue | null>(null);

/**
 * Estado global da Agenda — montado uma vez em `(member)/layout.tsx`,
 * disponível pra qualquer página do Portal chamar `openAgenda()`. O drawer
 * em si (`AgendaDrawer`) é montado aqui dentro, sempre presente na árvore
 * (visibilidade controlada por `isOpen`), então abrir a Agenda nunca navega
 * nem desmonta a página atual.
 */
export function AgendaProvider({
  events,
  canManageEvents,
  children,
}: {
  events: Event[];
  canManageEvents: boolean;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(events[0]?.id ?? null);

  const openAgenda = useCallback(
    (eventId?: string) => {
      // Sem id: sempre volta pra "visão geral" (o próximo evento em foco).
      setSelectedEventId(eventId ?? events[0]?.id ?? null);
      setIsOpen(true);
    },
    [events],
  );

  const closeAgenda = useCallback(() => setIsOpen(false), []);

  const value = useMemo<AgendaContextValue>(
    () => ({ isOpen, selectedEventId, events, canManageEvents, openAgenda, closeAgenda }),
    [isOpen, selectedEventId, events, canManageEvents, openAgenda, closeAgenda],
  );

  return (
    <AgendaContext.Provider value={value}>
      {children}
      <AgendaDrawer />
    </AgendaContext.Provider>
  );
}

/** Lança se usado fora do `AgendaProvider` — para consumidores que sabem que o Provider está montado (dentro do Portal do Irmão). */
export function useAgenda(): AgendaContextValue {
  const ctx = useContext(AgendaContext);
  if (!ctx) throw new Error('useAgenda deve ser usado dentro de <AgendaProvider>.');
  return ctx;
}

/** Nunca lança — usada por componentes compartilhados (ex.: `AppShell`) que também renderizam fora do Portal (Administração), onde o Provider não existe. */
export function useAgendaOptional(): AgendaContextValue | null {
  return useContext(AgendaContext);
}
