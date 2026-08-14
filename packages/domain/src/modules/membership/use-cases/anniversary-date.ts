/**
 * Cálculo de "próxima ocorrência anual" de uma data (iniciação, elevação,
 * exaltação, nascimento) — usado por `ListUpcomingAnniversariesUseCase`.
 * Trata 29/fev explicitamente (mapeia para 28/fev em anos não bissextos),
 * ao contrário do cron `birthday-reminder`, que não trata esse caso.
 */
export interface NextOccurrence {
  /** Dias até a próxima ocorrência a partir de `from` (0 = hoje). */
  diasAte: number;
  /** Quantos anos completos a ocorrência representa. */
  anosCompletos: number;
}

function safeDateForYear(date: Date, year: number): Date {
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(date.getDate(), daysInMonth);
  return new Date(year, month, safeDay);
}

export function computeNextOccurrence(from: Date, date: Date): NextOccurrence {
  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const thisYear = safeDateForYear(date, fromMidnight.getFullYear());
  const isPast = thisYear.getTime() < fromMidnight.getTime();
  const occurrence = isPast ? safeDateForYear(date, fromMidnight.getFullYear() + 1) : thisYear;

  const diasAte = Math.round((occurrence.getTime() - fromMidnight.getTime()) / 86_400_000);
  const anosCompletos = occurrence.getFullYear() - date.getFullYear();
  return { diasAte, anosCompletos };
}
