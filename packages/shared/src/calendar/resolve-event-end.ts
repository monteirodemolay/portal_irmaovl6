/** Duração padrão aplicada só nas fronteiras que exigem um horário de término concreto (exportação .ics/Google Calendar, sincronização externa, detecção de conflito) — nunca persistida como o horário real do evento, que pode legitimamente não ter fim definido (ex.: sessões da Loja). */
export const DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000;

export function resolveEventEnd(dataInicio: Date, dataFim: Date | null): Date {
  return dataFim ?? new Date(dataInicio.getTime() + DEFAULT_EVENT_DURATION_MS);
}
