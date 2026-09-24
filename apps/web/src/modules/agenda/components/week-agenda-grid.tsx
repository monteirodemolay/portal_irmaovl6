'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, cn } from '@vl6/ui';
import type { AgendaCategory, CalendarItem } from '../lib/calendar-item';

const WEEKDAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const CATEGORY_DOT_CLASS: Record<AgendaCategory, string> = {
  sessao: 'bg-primary',
  evento: 'bg-sky-500',
  aniversario: 'bg-amber-500',
  recesso: 'bg-teal-500',
  paramaconica: 'bg-violet-500',
  outra: 'bg-slate-500',
  personal: 'bg-emerald-500',
  google: 'bg-purple-500',
};

function dateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA').format(date);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(date);
}

function formatRangeLabel(start: Date, end: Date): string {
  const dayMonth = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
  const dayMonthYear = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return `${dayMonth.format(start)} – ${dayMonthYear.format(end)}`.replace(/\./g, '');
}

export interface WeekAgendaGridProps {
  items: CalendarItem[];
  /** Semana exibida inicialmente — a navegação (setas) é interna ao componente. */
  referenceDate: Date;
  overlapping: Set<string>;
  onSelectItem: (item: CalendarItem) => void;
  onNewPersonal: (date: Date) => void;
}

/**
 * Grade semanal real (7 colunas, itens sob cada dia) — antes a aba "Semana"
 * era só a mesma `ItemList` da aba "Hoje" filtrada por semana. Em telas
 * estreitas vira uma coluna única por dia (nunca força 7 colunas apertadas).
 */
export function WeekAgendaGrid({
  items,
  referenceDate,
  overlapping,
  onSelectItem,
  onNewPersonal,
}: WeekAgendaGridProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(referenceDate));

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const firstDay = new Date(item.inicio);
      firstDay.setHours(0, 0, 0, 0);
      const lastDay = item.category === 'recesso' && item.fim ? new Date(item.fim) : firstDay;
      lastDay.setHours(0, 0, 0, 0);

      for (let day = new Date(firstDay); day <= lastDay; day.setDate(day.getDate() + 1)) {
        const key = dateKey(day);
        const list = map.get(key) ?? [];
        list.push(item);
        map.set(key, list);
      }
    }
    for (const list of map.values()) list.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
    return map;
  }, [items]);

  const todayKey = dateKey(new Date());

  return (
    <div className="border-border rounded-xl border bg-white p-4">
      <div className="mb-3.5 grid grid-cols-[26px_1fr_26px] items-center">
        <button
          type="button"
          aria-label="Semana anterior"
          onClick={() => setWeekStart((prev) => addDays(prev, -7))}
          className="text-muted hover:text-foreground"
        >
          <ChevronLeft size={16} />
        </button>
        <strong className="text-center text-sm">{formatRangeLabel(days[0]!, days[6]!)}</strong>
        <button
          type="button"
          aria-label="Próxima semana"
          onClick={() => setWeekStart((prev) => addDays(prev, 7))}
          className="text-muted hover:text-foreground"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-7 sm:gap-2">
        {days.map((day) => {
          const key = dateKey(day);
          const dayItems = itemsByDay.get(key) ?? [];
          const isToday = key === todayKey;

          return (
            <div key={key} className="group/day flex flex-col gap-1.5">
              <div
                className={cn(
                  'flex items-center justify-between rounded-lg px-2 py-1 sm:flex-col sm:gap-0 sm:py-1.5',
                  isToday && 'bg-accent/10',
                )}
              >
                <div className="flex items-baseline gap-1.5 sm:flex-col sm:items-center sm:gap-0">
                  <span className="text-muted text-[10px] font-bold uppercase tracking-wide">
                    {WEEKDAY_LABELS[day.getDay()]}
                  </span>
                  <span
                    className={cn('font-display text-sm font-semibold', isToday && 'text-accent')}
                  >
                    {day.getDate()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNewPersonal(day)}
                  aria-label="Novo compromisso neste dia"
                  className="text-muted hover:text-primary opacity-0 transition-opacity group-hover/day:opacity-100"
                >
                  <Plus size={13} strokeWidth={2} />
                </button>
              </div>

              <div className="flex min-h-8 flex-col gap-1 sm:min-h-24">
                {dayItems.map((item) => (
                  <WeekItemChip
                    key={`${item.source}-${item.id}`}
                    item={item}
                    hasConflict={overlapping.has(item.id)}
                    onSelectItem={onSelectItem}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekItemChip({
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
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', CATEGORY_DOT_CLASS[item.category])} />
      <span className="text-muted shrink-0">
        {item.isInformational ? 'dia' : formatTime(item.inicio)}
      </span>
      <span className="truncate">{item.titulo}</span>
    </>
  );

  const chipClass = cn(
    'flex items-center gap-1.5 rounded px-1.5 py-1 text-left text-[11px] leading-tight transition-colors',
    hasConflict ? 'bg-red-50 text-red-700' : 'bg-background hover:bg-border/60',
  );

  const title = hasConflict ? `${item.titulo} — conflito de horário` : item.titulo;

  if (item.isInformational) {
    return (
      <div className={cn(chipClass, 'cursor-default')} title={title}>
        {content}
      </div>
    );
  }

  return (
    <button type="button" onClick={() => onSelectItem(item)} className={chipClass} title={title}>
      {content}
    </button>
  );
}
