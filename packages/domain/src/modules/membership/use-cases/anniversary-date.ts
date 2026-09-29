import { BRAZIL_TIME_ZONE } from '@vl6/shared';

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
  /**
   * Dia/mês da ocorrência (já com 29/fev corrigido para 28/fev quando
   * aplicável) como NÚMEROS, não um `Date` — quem consome isto (painel
   * "Esta semana na Loja", Client Component) recebe os dados via props que
   * atravessam a fronteira servidor/cliente do React. Um `Date` nessa
   * travessia é serializado como instante ISO e reconstruído no navegador:
   * `getDate()`/`getMonth()` nesse `Date` reconstruído leem o fuso horário
   * do NAVEGADOR do Irmão, não o do servidor — pra quem está em São Paulo
   * (UTC-3) vendo um `Date` que representa meia-noite UTC, isso empurra a
   * data um dia pra trás (22/09 virando 21/09, bug relatado pelo
   * Administrador). Números primitivos não sofrem esse deslocamento.
   */
  dia: number;
  mes: number;
}

function safeDateForYear(date: Date, year: number): Date {
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(date.getDate(), daysInMonth);
  return new Date(year, month, safeDay);
}

/**
 * "Hoje" no calendário de São Paulo, a partir de um instante real
 * (`IClock.now()`) — nunca o dia-calendário do próprio fuso do servidor.
 * Vercel roda funções serverless com `TZ=UTC` por padrão; sem essa
 * conversão explícita, `new Date(from.getFullYear(), from.getMonth(),
 * from.getDate())` usava o dia UTC como "hoje", que já virou o dia
 * seguinte 3 horas antes da meia-noite em São Paulo (21h–23h59 no horário
 * de Brasília) — todo aniversário dentro dessa janela contava "1 dia a
 * menos" do que devia (bug relatado pelo Administrador: aniversário
 * previsto pro dia certo aparecendo com a contagem — e a data exibida,
 * derivada da mesma referência de "hoje" errada — um dia adiantada).
 */
function todayInBrazil(from: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(from);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  return new Date(year, month - 1, day);
}

export function computeNextOccurrence(from: Date, date: Date): NextOccurrence {
  const fromMidnight = todayInBrazil(from);
  const thisYear = safeDateForYear(date, fromMidnight.getFullYear());
  const isPast = thisYear.getTime() < fromMidnight.getTime();
  const occurrence = isPast ? safeDateForYear(date, fromMidnight.getFullYear() + 1) : thisYear;

  const diasAte = Math.round((occurrence.getTime() - fromMidnight.getTime()) / 86_400_000);
  const anosCompletos = occurrence.getFullYear() - date.getFullYear();
  return { diasAte, anosCompletos, dia: occurrence.getDate(), mes: occurrence.getMonth() + 1 };
}
