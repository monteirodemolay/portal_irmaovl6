export const BRAZIL_TIME_ZONE = 'America/Sao_Paulo';

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

/**
 * Converte o valor "ingênuo" de um `<input type="datetime-local">` (ex.:
 * "2026-08-24T20:00"), interpretando-o como hora de parede em
 * `America/Sao_Paulo`, no instante UTC correto — necessário porque esse
 * parsing acontece na Server Action (Node.js), cujo fuso horário do processo
 * não é necessariamente o de Brasília (ver docs/architecture/06 §6.4).
 */
export function parseBrazilDateTimeLocal(value: string, timeZone = BRAZIL_TIME_ZONE): Date {
  const naiveUtc = new Date(value.endsWith('Z') ? value : `${value}Z`);
  if (Number.isNaN(naiveUtc.getTime())) return naiveUtc;
  const offsetMs = getTimeZoneOffsetMs(naiveUtc, timeZone);
  return new Date(naiveUtc.getTime() - offsetMs);
}
