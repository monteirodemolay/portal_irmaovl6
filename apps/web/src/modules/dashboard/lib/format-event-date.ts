export interface FormattedEventDate {
  day: string;
  month: string;
  weekday: string;
  timeRange: string;
}

/**
 * Formata data/hora de um `Event` para os cards de "Próximo Evento" e da
 * Agenda do Dashboard — mesma convenção pt-BR usada no restante do Portal.
 */
export function formatEventDate(dataInicio: Date, dataFim: Date): FormattedEventDate {
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(dataInicio);
  const startTime = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(dataInicio);
  const endTime = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' }).format(dataFim);

  return {
    day: new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(dataInicio),
    month: new Intl.DateTimeFormat('pt-BR', { month: 'short' })
      .format(dataInicio)
      .replace('.', '')
      .toUpperCase(),
    weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    timeRange: `${startTime} às ${endTime}`,
  };
}
