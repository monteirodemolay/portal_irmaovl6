'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, cn } from '@vl6/ui';
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

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function dateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA').format(date);
}

export interface MonthGridProps {
  items: CalendarItem[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

/**
 * Grade mensal genérica da Minha Agenda — deliberadamente separada de
 * `AgendaCalendar` (drawer institucional, intocado): aqui um dia pode ter
 * vários itens de origens diferentes (`Map<dateKey, CalendarItem[]>`).
 */
export function MonthGrid({ items, selectedDate, onSelectDate }: MonthGridProps) {
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  );

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = dateKey(item.inicio);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const monthLabel = capitalize(
    new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(displayedMonth),
  );

  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const selectedKey = dateKey(selectedDate);

  const cells: Array<{ day: number; date: Date | null }> = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push({ day: 0, date: null });
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, date: new Date(year, month, day) });
  }
  while (cells.length % 7 !== 0) cells.push({ day: 0, date: null });

  return (
    <div className="border-border rounded-xl border bg-white p-4">
      <div className="mb-3.5 grid grid-cols-[26px_1fr_26px] items-center">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => setDisplayedMonth(new Date(year, month - 1, 1))}
          className="text-muted hover:text-foreground"
        >
          <ChevronLeft size={16} />
        </button>
        <strong className="text-center text-sm">{monthLabel}</strong>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => setDisplayedMonth(new Date(year, month + 1, 1))}
          className="text-muted hover:text-foreground"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="text-muted mb-1 grid grid-cols-7 text-center text-[9px] font-bold">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, index) => {
          if (!cell.date) return <div key={`empty-${index}`} className="aspect-square" />;
          const date = cell.date;
          const key = dateKey(date);
          const dayItems = itemsByDay.get(key) ?? [];
          const isSelected = key === selectedKey;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(date)}
              className={cn(
                'relative m-0.5 flex aspect-square items-center justify-center rounded-full text-xs',
                isSelected
                  ? 'bg-accent font-bold text-white'
                  : dayItems.length > 0
                    ? 'hover:bg-accent/10 font-medium'
                    : 'text-muted hover:bg-background',
              )}
            >
              {cell.day}
              {dayItems.length > 0 && !isSelected && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {[...new Set(dayItems.map((item) => item.category))]
                    .slice(0, 3)
                    .map((category) => (
                      <span
                        key={category}
                        className={cn('h-1 w-1 rounded-full', CATEGORY_DOT_CLASS[category])}
                      />
                    ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
