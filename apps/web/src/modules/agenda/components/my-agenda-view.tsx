'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Event, PersonalEvent, PersonalNote } from '@vl6/domain';
import {
  SESSION_ACCESS_KINDS,
  SESSION_ACCESS_LABELS,
  SESSION_NATURE_LABELS,
  SESSION_NATURES_BY_TYPE,
  SESSION_TYPE_LABELS,
  SESSION_TYPES,
  SESSION_WORK_DEGREE_LABELS,
  SESSION_WORK_DEGREES,
  type SessionAccessKind,
  type SessionType,
  type SessionWorkDegree,
} from '@vl6/shared';
import {
  AlertTriangle,
  Clock,
  EmptyState,
  MapPin,
  Plus,
  Select,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  cn,
} from '@vl6/ui';
import { useAgendaOptional } from './agenda-provider';
import { PersonalEventDrawer } from './personal-event-drawer';
import { EventDetailPanel } from './event-detail-panel';
import { MonthGrid } from './month-grid';
import { WeekAgendaGrid } from './week-agenda-grid';
import {
  CATEGORY_BADGE_CLASS,
  CATEGORY_LABELS,
  detectOverlaps,
  toCalendarItems,
  type AgendaAnniversarySummary,
  type AgendaCategory,
  type CalendarItem,
  type GoogleCalendarEventSummary,
} from '../lib/calendar-item';

const CATEGORY_FILTERS: Array<{ value: AgendaCategory | 'all'; label: string }> = [
  { value: 'all', label: 'Tudo' },
  { value: 'sessao', label: 'Sessões' },
  { value: 'evento', label: 'Eventos' },
  { value: 'aniversario', label: 'Aniversários' },
  { value: 'paramaconica', label: 'Paramaçônicas' },
  { value: 'outra', label: 'Outras datas' },
  { value: 'personal', label: 'Pessoal' },
  { value: 'google', label: 'Google' },
];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
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
  if (item.isInformational) return 'Data comemorativa';
  const start = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(item.inicio);
  if (!item.fim) return start;
  const end = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(item.fim);
  return `${start} às ${end}`;
}

export interface MyAgendaViewProps {
  vl6Events: Event[];
  personalEvents: PersonalEvent[];
  googleEvents: GoogleCalendarEventSummary[];
  anniversaries: AgendaAnniversarySummary[];
  paramasonicEntityNames: Record<string, string>;
  personalNotes: PersonalNote[];
}

export function MyAgendaView({
  vl6Events,
  personalEvents,
  googleEvents,
  anniversaries,
  paramasonicEntityNames,
  personalNotes,
}: MyAgendaViewProps) {
  const agenda = useAgendaOptional();
  const router = useRouter();
  const [view, setView] = useState('mes');
  const [categoryFilter, setCategoryFilter] = useState<AgendaCategory | 'all'>('all');
  const [sessionFilter, setSessionFilter] =
    useState<SessionClassificationFilter>(EMPTY_SESSION_FILTER);
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);
  const [drawerState, setDrawerState] = useState<{
    open: boolean;
    event: PersonalEvent | null;
    defaultStart: Date | null;
  }>({ open: false, event: null, defaultStart: null });

  const allItems = useMemo(
    () =>
      toCalendarItems(
        vl6Events,
        personalEvents,
        googleEvents,
        anniversaries,
        paramasonicEntityNames,
      ),
    [vl6Events, personalEvents, googleEvents, anniversaries, paramasonicEntityNames],
  );
  const overlapping = useMemo(() => detectOverlaps(allItems), [allItems]);

  const filteredItems = useMemo(
    () =>
      allItems
        .filter((item) => categoryFilter === 'all' || item.category === categoryFilter)
        .filter((item) => matchesSessionFilter(item, sessionFilter)),
    [allItems, categoryFilter, sessionFilter],
  );

  const overview = useMemo(
    () => ({
      sessoes: allItems.filter((item) => item.category === 'sessao').length,
      eventos: allItems.filter((item) => item.category === 'evento').length,
      aniversarios: allItems.filter((item) => item.category === 'aniversario').length,
      paramaconicas: allItems.filter((item) => item.category === 'paramaconica').length,
    }),
    [allItems],
  );

  const now = new Date();
  const todayItems = filteredItems.filter((item) => isSameDay(item.inicio, now));
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

  function handleSelectItem(item: CalendarItem) {
    if (item.isInformational) return;
    if (item.source === 'vl6') {
      if (isVl6InDrawer(item)) {
        agenda?.openAgenda(item.id, {});
      } else {
        router.push(`/eventos/${item.id}`);
      }
      return;
    }
    setSelectedItem(item);
  }

  const overviewCards: Array<{
    label: string;
    value: number;
    category: AgendaCategory;
    helper: string;
  }> = [
    { label: 'Sessões', value: overview.sessoes, category: 'sessao', helper: 'Agenda maçônica' },
    { label: 'Eventos', value: overview.eventos, category: 'evento', helper: 'Atividades da Loja' },
    {
      label: 'Aniversariantes',
      value: overview.aniversarios,
      category: 'aniversario',
      helper: 'Irmãos e família',
    },
    {
      label: 'Paramaçônicas',
      value: overview.paramaconicas,
      category: 'paramaconica',
      helper: 'Entidades vinculadas',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <button
            key={card.category}
            type="button"
            onClick={() => setCategoryFilter(card.category)}
            className={cn(
              'border-border bg-white hover:border-primary/40 flex min-h-24 flex-col rounded-xl border p-4 text-left transition-colors',
              categoryFilter === card.category && 'border-primary ring-primary/10 ring-2',
            )}
          >
            <span className="text-muted text-[11px] font-semibold uppercase tracking-wide">
              {card.label}
            </span>
            <span className="font-display mt-1 text-2xl font-semibold">{card.value}</span>
            <span className="text-muted mt-auto text-xs">{card.helper}</span>
          </button>
        ))}
      </div>

      <div className="border-border flex flex-col gap-4 rounded-xl border bg-white p-4">
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
          {CATEGORY_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setCategoryFilter(filter.value)}
              className={cn(
                'h-8 rounded-full border px-3 text-xs font-semibold transition-colors',
                categoryFilter === filter.value
                  ? 'bg-primary border-primary text-white'
                  : 'border-border text-muted hover:text-foreground bg-white',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {(categoryFilter === 'all' || categoryFilter === 'sessao') && (
          <SessionClassificationFilters value={sessionFilter} onChange={setSessionFilter} />
        )}
      </div>

      <Tabs value={view} onValueChange={setView}>
        <TabsContent value="hoje">
          <ItemList
            items={todayItems}
            emptyTitle="Nada agendado para hoje"
            overlapping={overlapping}
            onSelectItem={handleSelectItem}
          />
        </TabsContent>

        <TabsContent value="semana">
          <WeekAgendaGrid
            items={filteredItems}
            referenceDate={now}
            overlapping={overlapping}
            onSelectItem={handleSelectItem}
            onNewPersonal={(date) => openNewPersonal(date)}
          />
        </TabsContent>

        <TabsContent value="mes">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
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
                onSelectItem={handleSelectItem}
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
            onSelectItem={handleSelectItem}
          />
        </TabsContent>
      </Tabs>

      <button
        type="button"
        onClick={() => openNewPersonal()}
        aria-label="Novo compromisso"
        className="bg-primary hover:bg-primary-dark fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-md sm:hidden"
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

      <EventDetailPanel
        item={selectedItem}
        onOpenChange={(open) => {
          if (!open) setSelectedItem(null);
        }}
        onEditPersonal={openEditPersonal}
        personalNotes={personalNotes}
        overlapping={overlapping}
      />
    </div>
  );
}

interface SessionClassificationFilter {
  sessionType: SessionType | 'all';
  sessionNature: string | 'all';
  degreeWork: SessionWorkDegree | 'all';
  access: SessionAccessKind | 'all';
}

const EMPTY_SESSION_FILTER: SessionClassificationFilter = {
  sessionType: 'all',
  sessionNature: 'all',
  degreeWork: 'all',
  access: 'all',
};

function matchesSessionFilter(item: CalendarItem, filter: SessionClassificationFilter): boolean {
  if (
    filter.sessionType === 'all' &&
    filter.sessionNature === 'all' &&
    filter.degreeWork === 'all' &&
    filter.access === 'all'
  ) {
    return true;
  }
  if (!item.session) return item.category !== 'sessao';
  return (
    (filter.sessionType === 'all' || item.session.sessionType === filter.sessionType) &&
    (filter.sessionNature === 'all' || item.session.sessionNature === filter.sessionNature) &&
    (filter.degreeWork === 'all' || item.session.degreeWork === filter.degreeWork) &&
    (filter.access === 'all' || item.session.access === filter.access)
  );
}

function SessionClassificationFilters({
  value,
  onChange,
}: {
  value: SessionClassificationFilter;
  onChange: (value: SessionClassificationFilter) => void;
}) {
  const natureOptions =
    value.sessionType === 'all' ? [] : SESSION_NATURES_BY_TYPE[value.sessionType];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted text-xs font-semibold">Detalhar Sessões:</span>
      <Select
        value={value.sessionType}
        onChange={(e) =>
          onChange({
            ...value,
            sessionType: e.target.value as SessionType | 'all',
            sessionNature: 'all',
          })
        }
        className="h-8 w-auto text-xs"
      >
        <option value="all">Todo Tipo</option>
        {SESSION_TYPES.map((type) => (
          <option key={type} value={type}>
            {SESSION_TYPE_LABELS[type]}
          </option>
        ))}
      </Select>
      <Select
        value={value.sessionNature}
        onChange={(e) => onChange({ ...value, sessionNature: e.target.value })}
        disabled={value.sessionType === 'all'}
        className="h-8 w-auto text-xs"
      >
        <option value="all">Toda Natureza</option>
        {natureOptions.map((nature) => (
          <option key={nature} value={nature}>
            {SESSION_NATURE_LABELS[nature] ?? nature}
          </option>
        ))}
      </Select>
      <Select
        value={value.degreeWork}
        onChange={(e) =>
          onChange({ ...value, degreeWork: e.target.value as SessionWorkDegree | 'all' })
        }
        className="h-8 w-auto text-xs"
      >
        <option value="all">Todo Grau</option>
        {SESSION_WORK_DEGREES.map((degree) => (
          <option key={degree} value={degree}>
            {SESSION_WORK_DEGREE_LABELS[degree]}
          </option>
        ))}
      </Select>
      <Select
        value={value.access}
        onChange={(e) =>
          onChange({ ...value, access: e.target.value as SessionAccessKind | 'all' })
        }
        className="h-8 w-auto text-xs"
      >
        <option value="all">Todo Acesso</option>
        {SESSION_ACCESS_KINDS.map((access) => (
          <option key={access} value={access}>
            {SESSION_ACCESS_LABELS[access]}
          </option>
        ))}
      </Select>
      {(value.sessionType !== 'all' ||
        value.sessionNature !== 'all' ||
        value.degreeWork !== 'all' ||
        value.access !== 'all') && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_SESSION_FILTER)}
          className="text-accent text-xs font-semibold hover:underline"
        >
          Limpar
        </button>
      )}
    </div>
  );
}

function ItemList({
  items,
  emptyTitle,
  overlapping,
  onSelectItem,
  action,
}: {
  items: CalendarItem[];
  emptyTitle: string;
  overlapping: Set<string>;
  onSelectItem: (item: CalendarItem) => void;
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
          onSelectItem={onSelectItem}
        />
      ))}
    </div>
  );
}

function CalendarItemRow({
  item,
  hasConflict,
  onSelectItem,
}: {
  item: CalendarItem;
  hasConflict: boolean;
  onSelectItem: (item: CalendarItem) => void;
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
              CATEGORY_BADGE_CLASS[item.category],
            )}
          >
            {CATEGORY_LABELS[item.category]}
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
          {item.contextLabel && <span>{item.contextLabel}</span>}
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

  if (item.isInformational) {
    return <div className={cn(rowClassName, 'cursor-default')}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onSelectItem(item)}
      className={cn(rowClassName, 'hover:bg-background w-full')}
    >
      {content}
    </button>
  );
}
