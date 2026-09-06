'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Event } from '@vl6/domain';
import { AgendaDrawer } from './agenda-drawer';

export interface AgendaOpenOptions {
  /** Restringe a lista/calendário do drawer só a Sessões — usado pelo botão "mais sessões" do Início, que não deve misturar Sessões com outros tipos de Evento. */
  onlySessions?: boolean;
}

export interface AgendaContextValue {
  isOpen: boolean;
  selectedEventId: string | null;
  events: Event[];
  /** `events` já restrito pelo filtro ativo (ver `AgendaOpenOptions.onlySessions`) — o que a lista/calendário do drawer devem renderizar. */
  filteredEvents: Event[];
  /** `true` quando o drawer foi aberto restrito só a Sessões — controla o cabeçalho e outros textos condicionais. */
  onlySessions: boolean;
  canManageEvents: boolean;
  openAgenda: (eventId?: string, options?: AgendaOpenOptions) => void;
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
  const [onlySessions, setOnlySessions] = useState(false);

  const filteredEvents = useMemo(
    () => (onlySessions ? events.filter((event) => event.tipo === 'sessao') : events),
    [events, onlySessions],
  );

  const openAgenda = useCallback(
    (eventId?: string, options?: AgendaOpenOptions) => {
      const scoped = options?.onlySessions ?? false;
      setOnlySessions(scoped);
      const pool = scoped ? events.filter((event) => event.tipo === 'sessao') : events;
      // Sem id: sempre volta pra "visão geral" (o próximo evento em foco, já dentro do filtro ativo).
      setSelectedEventId(eventId ?? pool[0]?.id ?? null);
      setIsOpen(true);
    },
    [events],
  );

  const closeAgenda = useCallback(() => setIsOpen(false), []);

  const value = useMemo<AgendaContextValue>(
    () => ({
      isOpen,
      selectedEventId,
      events,
      filteredEvents,
      onlySessions,
      canManageEvents,
      openAgenda,
      closeAgenda,
    }),
    [
      isOpen,
      selectedEventId,
      events,
      filteredEvents,
      onlySessions,
      canManageEvents,
      openAgenda,
      closeAgenda,
    ],
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
