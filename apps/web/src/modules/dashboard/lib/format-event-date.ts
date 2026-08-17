import { BRAZIL_TIME_ZONE } from '@vl6/shared';

export interface FormattedEventDate {
  day: string;
  month: string;
  weekday: string;
  /** Dia da semana sem o sufixo "-feira" (ex.: "Segunda"), pro bloco de data compacto. */
  weekdayShort: string;
  timeRange: string;
  /** `true` quando quem cadastrou o evento informou um horário de término. */
  hasEndTime: boolean;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Formata data/hora de um `Event` para os cards de "Próximo Evento" e da
 * Agenda do Dashboard — mesma convenção pt-BR usada no restante do Portal.
 * Roda em Server Components, então precisa fixar `timeZone` explicitamente
 * (o runtime do servidor não é necessariamente o horário de Brasília).
 */
export function formatEventDate(dataInicio: Date, dataFim: Date | null): FormattedEventDate {
  const weekdayRaw = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    timeZone: BRAZIL_TIME_ZONE,
  }).format(dataInicio);
  const startTime = new Intl.DateTimeFormat('pt-BR', {
    timeStyle: 'short',
    timeZone: BRAZIL_TIME_ZONE,
  }).format(dataInicio);
  const endTime = dataFim
    ? new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short', timeZone: BRAZIL_TIME_ZONE }).format(
        dataFim,
      )
    : null;

  return {
    day: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', timeZone: BRAZIL_TIME_ZONE }).format(
      dataInicio,
    ),
    month: new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: BRAZIL_TIME_ZONE })
      .format(dataInicio)
      .replace('.', '')
      .toUpperCase(),
    weekday: capitalize(weekdayRaw),
    weekdayShort: capitalize(weekdayRaw.replace('-feira', '')),
    timeRange: endTime ? `${startTime} às ${endTime}` : startTime,
    hasEndTime: endTime !== null,
  };
}
