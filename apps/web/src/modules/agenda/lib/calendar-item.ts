import type { Event, PersonalEvent } from '@vl6/domain';

export type CalendarSource = 'vl6' | 'google' | 'personal';

export const SOURCE_LABELS: Record<CalendarSource, string> = {
  vl6: 'VL6 / Loja',
  google: 'Google',
  personal: 'Pessoal',
};

export const SOURCE_BADGE_CLASS: Record<CalendarSource, string> = {
  vl6: 'bg-primary/10 text-primary',
  google: 'bg-purple-100 text-purple-700',
  personal: 'bg-emerald-100 text-emerald-700',
};

/** Recorte mínimo de um evento Google já sincronizado localmente — ver módulo `integrations`. */
export interface GoogleCalendarEventSummary {
  id: string;
  titulo: string;
  inicio: Date;
  fim: Date;
  local: string | null;
}

/** Modelo único de exibição para as 3 origens da Minha Agenda. */
export interface CalendarItem {
  id: string;
  source: CalendarSource;
  titulo: string;
  inicio: Date;
  /** `null` = sem horário de término definido (só ocorre em eventos VL6, ex.: sessões). */
  fim: Date | null;
  local: string | null;
  /** `Event.tipo === 'aniversario'` — chip informativo, não clicável, ignorado na detecção de conflito. */
  isBirthday: boolean;
}

export function toCalendarItems(
  vl6: Event[],
  personal: PersonalEvent[],
  google: GoogleCalendarEventSummary[],
): CalendarItem[] {
  const items: CalendarItem[] = [
    ...vl6.map(
      (event): CalendarItem => ({
        id: event.id,
        source: 'vl6',
        titulo: event.titulo,
        inicio: event.dataInicio,
        fim: event.dataFim,
        local: event.local,
        isBirthday: event.tipo === 'aniversario',
      }),
    ),
    ...personal.map(
      (event): CalendarItem => ({
        id: event.id,
        source: 'personal',
        titulo: event.titulo,
        inicio: event.dataInicio,
        fim: event.dataFim,
        local: event.local,
        isBirthday: false,
      }),
    ),
    ...google.map(
      (event): CalendarItem => ({
        id: event.id,
        source: 'google',
        titulo: event.titulo,
        inicio: event.inicio,
        fim: event.fim,
        local: event.local,
        isBirthday: false,
      }),
    ),
  ];

  return items.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

/**
 * IDs dos itens cujo horário se sobrepõe a outro — badge de aviso puramente
 * visual (client-side), não precisa ser à prova de adulteração. Aniversários
 * (`isBirthday`) nunca entram na checagem, nem como origem nem como alvo. Um
 * item sem `fim` definido (sessão sem horário de encerramento) também não
 * entra — sem duração conhecida, não há como afirmar que ele se sobrepõe a
 * outro compromisso.
 */
export function detectOverlaps(items: CalendarItem[]): Set<string> {
  const overlapping = new Set<string>();
  const relevant = items.filter(
    (item): item is CalendarItem & { fim: Date } => !item.isBirthday && item.fim !== null,
  );

  for (let i = 0; i < relevant.length; i += 1) {
    for (let j = i + 1; j < relevant.length; j += 1) {
      const a = relevant[i]!;
      const b = relevant[j]!;
      if (a.inicio < b.fim && b.inicio < a.fim) {
        overlapping.add(a.id);
        overlapping.add(b.id);
      }
    }
  }

  return overlapping;
}
