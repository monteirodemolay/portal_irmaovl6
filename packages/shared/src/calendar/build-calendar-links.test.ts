import { describe, expect, it } from 'vitest';
import { buildGoogleCalendarUrl, buildIcsContent } from './build-calendar-links';

const event = {
  titulo: 'Sessão Ordinária',
  descricao: 'Sessão mensal, com jantar após.',
  local: 'Templo da Loja',
  dataInicio: new Date('2026-09-07T20:00:00-03:00'),
  dataFim: new Date('2026-09-07T22:00:00-03:00'),
};

describe('buildGoogleCalendarUrl', () => {
  it('monta a URL de criação de evento com os dados em UTC', () => {
    const url = buildGoogleCalendarUrl(event);
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(parsed.searchParams.get('action')).toBe('TEMPLATE');
    expect(parsed.searchParams.get('text')).toBe('Sessão Ordinária');
    expect(parsed.searchParams.get('location')).toBe('Templo da Loja');
    expect(parsed.searchParams.get('dates')).toBe('20260907T230000Z/20260908T010000Z');
    expect(parsed.searchParams.get('details')).toBe('Sessão mensal, com jantar após.');
  });

  it('omite "details" quando não há descrição', () => {
    const url = buildGoogleCalendarUrl({ ...event, descricao: null });
    expect(new URL(url).searchParams.has('details')).toBe(false);
  });
});

describe('buildIcsContent', () => {
  it('gera um VEVENT válido com os campos escapados', () => {
    const ics = buildIcsContent(
      { ...event, titulo: 'Sessão; Especial, Aprendiz' },
      'evento-1@portal.vl6.com.br',
    );

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:evento-1@portal.vl6.com.br');
    expect(ics).toContain('DTSTART:20260907T230000Z');
    expect(ics).toContain('DTEND:20260908T010000Z');
    expect(ics).toContain('SUMMARY:Sessão\\; Especial\\, Aprendiz');
    expect(ics).toContain('LOCATION:Templo da Loja');
    expect(ics).toContain('DESCRIPTION:Sessão mensal\\, com jantar após.');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics.split('\r\n').length).toBeGreaterThan(1);
  });

  it('omite DESCRIPTION quando não há descrição', () => {
    const ics = buildIcsContent({ ...event, descricao: null }, 'evento-2@portal.vl6.com.br');
    expect(ics).not.toContain('DESCRIPTION');
  });
});
