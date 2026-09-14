'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Event } from '@vl6/domain';
import { AgendaDrawer } from './agenda-drawer';

/** Sessão ('sessions') ou os demais tipos de Evento ('events') — nunca os dois misturados quando um filtro está ativo. */
export type AgendaScope = 'sessions' | 'events';

export interface AgendaOpenOptions {
  /** Restringe a lista/calendário do drawer a um dos dois grupos — usado pelos botões "mais sessões"/"Ver todos" do Início, que nunca devem misturar Sessão com outros tipos de Evento. Omitido/`undefined` = sem filtro (Agenda completa). */
  scope?: AgendaScope;
}

export interface AgendaContextValue {
  isOpen: boolean;
  selectedEventId: string | null;
  events: Event[];
  /** `events` já restrito pelo filtro ativo (ver `AgendaOpenOptions.scope`) — o que a lista/calendário do drawer devem renderizar. */
  filteredEvents: Event[];
  /** Filtro ativo do drawer — controla o cabeçalho e outros textos condicionais. `undefined` = Agenda completa, sem filtro. */
  scope: AgendaScope | undefined;
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
  const [scope, setScope] = useState<AgendaScope | undefined>(undefined);

  const applyScope = useCallback((activeScope: AgendaScope | undefined, pool: Event[]) => {
    if (activeScope === 'sessions') return pool.filter((event) => event.tipo === 'sessao');
    if (activeScope === 'events') return pool.filter((event) => event.tipo !== 'sessao');
    return pool;
  }, []);

  const filteredEvents = useMemo(() => applyScope(scope, events), [applyScope, events, scope]);

  const openAgenda = useCallback(
    (eventId?: string, options?: AgendaOpenOptions) => {
      // `options` omitido (navegação dentro do próprio drawer — escolher
      // outro item da lista/calendário) preserva o filtro já ativo; só uma
      // chamada externa (botão "mais sessões"/"Ver todos", sempre manda
      // `options`, mesmo `{}`) decide trocar de filtro.
      const nextScope = options ? options.scope : scope;
      setScope(nextScope);
      const pool = applyScope(nextScope, events);
      // Sem id: sempre volta pra "visão geral" (o próximo evento em foco, já dentro do filtro ativo).
      setSelectedEventId(eventId ?? pool[0]?.id ?? null);
      setIsOpen(true);
    },
    [applyScope, events, scope],
  );

  const closeAgenda = useCallback(() => setIsOpen(false), []);

  const value = useMemo<AgendaContextValue>(
    () => ({
      isOpen,
      selectedEventId,
      events,
      filteredEvents,
      scope,
      canManageEvents,
      openAgenda,
      closeAgenda,
    }),
    [
      isOpen,
      selectedEventId,
      events,
      filteredEvents,
      scope,
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
