/**
 * Geração de link do Google Calendar e conteúdo `.ics` (RFC 5545) para um
 * evento da Agenda — nunca acessa a agenda pessoal do Irmão (sem OAuth/API
 * de terceiros): o link do Google só abre a tela de "criar evento" já
 * preenchida, quem confirma é o próprio usuário; o `.ics` é um arquivo
 * estático que qualquer app de calendário (Outlook, Apple Calendar, etc.)
 * importa manualmente.
 */

import { resolveEventEnd } from './resolve-event-end';

export interface CalendarEventInput {
  titulo: string;
  descricao: string | null;
  local: string;
  dataInicio: Date;
  /** `null` = sem horário de término definido (ex.: sessão sem hora de encerrar) — resolvido para +1h só nesta exportação, nunca persistido. */
  dataFim: Date | null;
}

function formatUtcCompact(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export function buildGoogleCalendarUrl(event: CalendarEventInput): string {
  const dataFim = resolveEventEnd(event.dataInicio, event.dataFim);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.titulo,
    dates: `${formatUtcCompact(event.dataInicio)}/${formatUtcCompact(dataFim)}`,
    location: event.local,
  });
  if (event.descricao) params.set('details', event.descricao);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function buildIcsContent(event: CalendarEventInput, uid: string): string {
  const dataFim = resolveEventEnd(event.dataInicio, event.dataFim);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Portal do Irmão VL6//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatUtcCompact(new Date())}`,
    `DTSTART:${formatUtcCompact(event.dataInicio)}`,
    `DTEND:${formatUtcCompact(dataFim)}`,
    `SUMMARY:${escapeIcsText(event.titulo)}`,
    `LOCATION:${escapeIcsText(event.local)}`,
  ];
  if (event.descricao) lines.push(`DESCRIPTION:${escapeIcsText(event.descricao)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}
