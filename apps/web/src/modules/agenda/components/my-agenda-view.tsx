'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Event, PersonalEvent } from '@vl6/domain';
import {
  AlertTriangle,
  Clock,
  EmptyState,
  MapPin,
  Plus,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from '@vl6/ui';
import { useAgendaOptional } from './agenda-provider';
import { PersonalEventDrawer } from './personal-event-drawer';
import { MonthGrid } from './month-grid';
import {
  detectOverlaps,
  toCalendarItems,
  type CalendarItem,
  type CalendarSource,
  type GoogleCalendarEventSummary,
} from '../lib/calendar-item';

const SOURCE_FILTERS: Array<{ value: CalendarSource | 'all'; label: string }> = [
  { value: 'all', label: 'Tudo' },
  { value: 'vl6', label: 'VL6' },
  { value: 'google', label: 'Google' },
  { value: 'personal', label: 'Pessoal' },
];

const SOURCE_LABELS: Record<CalendarSource, string> = {
  vl6: 'VL6 / Loja',
  google: 'Google',
  personal: 'Pessoal',
};

const SOURCE_BADGE_CLASS: Record<CalendarSource, string> = {
  vl6: 'bg-primary/10 text-primary',
  google: 'bg-purple-100 text-purple-700',
  personal: 'bg-emerald-100 text-emerald-700',
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 7);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatItemDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(date)
    .replace('.', '');
}

function formatItemTime(item: CalendarItem): string {
  const start = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(item.inicio);
  if (!item.fim) return start;
  const end = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(item.fim);
  return `${start} às ${end}`;
}

export interface MyAgendaViewProps {
  vl6Events: Event[];
  personalEvents: PersonalEvent[];
  googleEvents: GoogleCalendarEventSummary[];
}

export function MyAgendaView({ vl6Events, personalEvents, googleEvents }: MyAgendaViewProps) {
  const agenda = useAgendaOptional();
  const [view, setView] = useState('lista');
  const [sourceFilter, setSourceFilter] = useState<CalendarSource | 'all'>('all');
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [drawerState, setDrawerState] = useState<{
    open: boolean;
    event: PersonalEvent | null;
    defaultStart: Date | null;
  }>({ open: false, event: null, defaultStart: null });

  const allItems = useMemo(
    () => toCalendarItems(vl6Events, personalEvents, googleEvents),
    [vl6Events, personalEvents, googleEvents],
  );
  const overlapping = useMemo(() => detectOverlaps(allItems), [allItems]);

  const filteredItems = useMemo(
    () =>
      sourceFilter === 'all' ? allItems : allItems.filter((item) => item.source === sourceFilter),
    [allItems, sourceFilter],
  );

  const now = new Date();
  const todayItems = filteredItems.filter((item) => isSameDay(item.inicio, now));
  const weekStart = startOfWeek(now);
  const weekEnd = endOfWeek(now);
  const weekItems = filteredItems.filter(
    (item) => item.inicio >= weekStart && item.inicio < weekEnd,
  );
  const dayItems = filteredItems.filter((item) => isSameDay(item.inicio, selectedDay));
  const upcomingItems = filteredItems
    .filter((item) => (item.fim ?? item.inicio) >= startOfDay(now))
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  function openNewPersonal(defaultStart?: Date) {
    setDrawerState({ open: true, event: null, defaultStart: defaultStart ?? null });
  }

  function openEditPersonal(item: CalendarItem) {
    const original = personalEvents.find((event) => event.id === item.id) ?? null;
    setDrawerState({ open: true, event: original, defaultStart: null });
  }

  function isVl6InDrawer(item: CalendarItem): boolean {
    return agenda !== null && agenda.events.some((event) => event.id === item.id);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="border-none">
            <TabsTrigger value="hoje">Hoje</TabsTrigger>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="mes">Mês</TabsTrigger>
            <TabsTrigger value="lista">Lista</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => openNewPersonal()}
            className="bg-primary hover:bg-primary-dark flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white transition-colors"
          >
            <Plus size={14} />
            Novo compromisso
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SOURCE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setSourceFilter(filter.value)}
            className={cn(
              'h-8 rounded-full border px-3 text-xs font-semibold transition-colors',
              sourceFilter === filter.value
                ? 'bg-primary border-primary text-white'
                : 'border-border text-muted hover:text-foreground bg-white',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <Tabs value={view} onValueChange={setView}>
        <TabsContent value="hoje">
          <ItemList
            items={todayItems}
            emptyTitle="Nada agendado para hoje"
            overlapping={overlapping}
            isVl6InDrawer={isVl6InDrawer}
            onOpenVl6={(id) => agenda?.openAgenda(id)}
            onOpenPersonal={openEditPersonal}
          />
        </TabsContent>

        <TabsContent value="semana">
          <ItemList
            items={weekItems}
            emptyTitle="Nada agendado esta semana"
            overlapping={overlapping}
            isVl6InDrawer={isVl6InDrawer}
            onOpenVl6={(id) => agenda?.openAgenda(id)}
            onOpenPersonal={openEditPersonal}
          />
        </TabsContent>

        <TabsContent value="mes">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <MonthGrid
              items={filteredItems}
              selectedDate={selectedDay}
              onSelectDate={setSelectedDay}
            />
            <div className="flex flex-col gap-2">
              <p className="text-muted text-xs font-semibold uppercase tracking-wide">
                {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(selectedDay)}
              </p>
              <ItemList
                items={dayItems}
                emptyTitle="Nenhum compromisso neste dia"
                overlapping={overlapping}
                isVl6InDrawer={isVl6InDrawer}
                onOpenVl6={(id) => agenda?.openAgenda(id)}
                onOpenPersonal={openEditPersonal}
                action={
                  <button
                    type="button"
                    onClick={() => openNewPersonal(selectedDay)}
                    className="text-primary text-xs font-semibold hover:underline"
                  >
                    + Novo compromisso neste dia
                  </button>
                }
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="lista">
          <ItemList
            items={upcomingItems}
            emptyTitle="Nenhum compromisso futuro"
            overlapping={overlapping}
            isVl6InDrawer={isVl6InDrawer}
            onOpenVl6={(id) => agenda?.openAgenda(id)}
            onOpenPersonal={openEditPersonal}
          />
        </TabsContent>
      </Tabs>

      <button
        type="button"
        onClick={() => openNewPersonal()}
        aria-label="Novo compromisso"
        className="bg-primary hover:bg-primary-dark fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <Plus size={22} />
      </button>

      <PersonalEventDrawer
        open={drawerState.open}
        onOpenChange={(open) => setDrawerState((prev) => ({ ...prev, open }))}
        event={drawerState.event}
        defaultStart={drawerState.defaultStart}
      />
    </div>
  );
}

function ItemList({
  items,
  emptyTitle,
  overlapping,
  isVl6InDrawer,
  onOpenVl6,
  onOpenPersonal,
  action,
}: {
  items: CalendarItem[];
  emptyTitle: string;
  overlapping: Set<string>;
  isVl6InDrawer: (item: CalendarItem) => boolean;
  onOpenVl6: (id: string) => void;
  onOpenPersonal: (item: CalendarItem) => void;
  action?: React.ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="border-border rounded-xl border bg-white">
        <EmptyState title={emptyTitle} />
        {action && <div className="pb-4 text-center">{action}</div>}
      </div>
    );
  }

  return (
    <div className="border-border divide-border flex flex-col divide-y rounded-xl border bg-white">
      {action && <div className="px-4 pt-3">{action}</div>}
      {items.map((item) => (
        <CalendarItemRow
          key={`${item.source}-${item.id}`}
          item={item}
          hasConflict={overlapping.has(item.id)}
          clickableVl6={isVl6InDrawer(item)}
          onOpenVl6={onOpenVl6}
          onOpenPersonal={onOpenPersonal}
        />
      ))}
    </div>
  );
}

function CalendarItemRow({
  item,
  hasConflict,
  clickableVl6,
  onOpenVl6,
  onOpenPersonal,
}: {
  item: CalendarItem;
  hasConflict: boolean;
  clickableVl6: boolean;
  onOpenVl6: (id: string) => void;
  onOpenPersonal: (item: CalendarItem) => void;
}) {
  const content = (
    <>
      <div className="w-14 shrink-0 text-center">
        <p className="font-display text-sm font-semibold leading-none">
          {formatItemDate(item.inicio)}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{item.titulo}</p>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
              SOURCE_BADGE_CLASS[item.source],
            )}
          >
            {SOURCE_LABELS[item.source]}
          </span>
        </div>
        <div className="text-muted mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatItemTime(item)}
          </span>
          {item.local && (
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {item.local}
            </span>
          )}
        </div>
        {hasConflict && (
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
            <AlertTriangle size={11} />
            Conflito de horário
          </p>
        )}
      </div>
    </>
  );

  const rowClassName = 'flex items-center gap-3 px-4 py-3 text-left transition-colors';

  if (item.isBirthday) {
    return <div className={cn(rowClassName, 'cursor-default')}>{content}</div>;
  }

  if (item.source === 'vl6') {
    if (clickableVl6) {
      return (
        <button
          type="button"
          onClick={() => onOpenVl6(item.id)}
          className={cn(rowClassName, 'hover:bg-background w-full')}
        >
          {content}
        </button>
      );
    }
    return (
      <Link href={`/eventos/${item.id}`} className={cn(rowClassName, 'hover:bg-background')}>
        {content}
      </Link>
    );
  }

  if (item.source === 'personal') {
    return (
      <button
        type="button"
        onClick={() => onOpenPersonal(item)}
        className={cn(rowClassName, 'hover:bg-background w-full')}
      >
        {content}
      </button>
    );
  }

  return <div className={cn(rowClassName, 'cursor-default')}>{content}</div>;
}
