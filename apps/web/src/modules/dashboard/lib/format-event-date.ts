export interface FormattedEventDate {
  day: string;
  month: string;
  weekday: string;
  /** Dia da semana sem o sufixo "-feira" (ex.: "Segunda"), pro bloco de data compacto. */
  weekdayShort: string;
  timeRange: string;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Formata data/hora de um `Event` para os cards de "Próximo Evento" e da
 * Agenda do Dashboard — mesma convenção pt-BR usada no restante do Portal.
 */
export function formatEventDate(dataInicio: Date, dataFim: Date): FormattedEventDate {
  const weekdayRaw = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(dataInicio);
  const startTime = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(dataInicio);
  const endTime = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(dataFim);

  return {
    day: new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(dataInicio),
    month: new Intl.DateTimeFormat('pt-BR', { month: 'short' })
      .format(dataInicio)
      .replace('.', '')
      .toUpperCase(),
    weekday: capitalize(weekdayRaw),
    weekdayShort: capitalize(weekdayRaw.replace('-feira', '')),
    timeRange: `${startTime} às ${endTime}`,
  };
}
