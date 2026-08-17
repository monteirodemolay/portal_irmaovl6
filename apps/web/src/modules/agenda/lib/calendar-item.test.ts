import { describe, expect, it } from 'vitest';
import type { Event, PersonalEvent } from '@vl6/domain';
import { detectOverlaps, toCalendarItems, type GoogleCalendarEventSummary } from './calendar-item';

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'e1',
    tenantId: 't1',
    tipo: 'sessao',
    titulo: 'Sessão Ordinária',
    descricao: null,
    local: 'Sede da Loja',
    dataInicio: new Date('2026-08-18T20:00:00Z'),
    dataFim: new Date('2026-08-18T22:00:00Z'),
    exigeConfirmacaoPresenca: false,
    capacidadeMaxima: null,
    traje: null,
    chegadaSugerida: null,
    observacoes: null,
    arquivosRelacionados: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildPersonalEvent(overrides: Partial<PersonalEvent> = {}): PersonalEvent {
  return {
    id: 'pe1',
    tenantId: 't1',
    userId: 'u1',
    titulo: 'Dentista',
    descricao: null,
    local: null,
    dataInicio: new Date('2026-08-19T09:00:00Z'),
    dataFim: new Date('2026-08-19T10:00:00Z'),
    lembreteMinutosAntes: null,
    sincronizarComGoogle: false,
    googleEventId: null,
    createdAt: new Date('2026-08-01'),
    updatedAt: new Date('2026-08-01'),
    createdBy: 'u1',
    updatedBy: 'u1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildGoogleEvent(overrides: Partial<GoogleCalendarEventSummary> = {}): GoogleCalendarEventSummary {
  return {
    id: 'g1',
    titulo: 'Reunião de trabalho',
    inicio: new Date('2026-08-20T15:00:00Z'),
    fim: new Date('2026-08-20T16:00:00Z'),
    local: 'Google Meet',
    ...overrides,
  };
}

describe('toCalendarItems', () => {
  it('normaliza e ordena cronologicamente as 3 origens', () => {
    const items = toCalendarItems(
      [buildEvent({ dataInicio: new Date('2026-08-20T00:00:00Z') })],
      [buildPersonalEvent({ dataInicio: new Date('2026-08-18T00:00:00Z') })],
      [buildGoogleEvent({ inicio: new Date('2026-08-19T00:00:00Z') })],
    );

    expect(items.map((i) => i.source)).toEqual(['personal', 'google', 'vl6']);
  });

  it('marca isBirthday para eventos VL6 do tipo aniversario', () => {
    const items = toCalendarItems([buildEvent({ tipo: 'aniversario' })], [], []);

    expect(items[0]?.isBirthday).toBe(true);
  });
});

describe('detectOverlaps', () => {
  it('detecta dois itens com horários sobrepostos', () => {
    const items = toCalendarItems(
      [buildEvent({ id: 'e1', dataInicio: new Date('2026-08-18T19:00:00Z'), dataFim: new Date('2026-08-18T21:00:00Z') })],
      [buildPersonalEvent({ id: 'pe1', dataInicio: new Date('2026-08-18T20:00:00Z'), dataFim: new Date('2026-08-18T22:00:00Z') })],
      [],
    );

    const overlaps = detectOverlaps(items);

    expect(overlaps.has('e1')).toBe(true);
    expect(overlaps.has('pe1')).toBe(true);
  });

  it('não marca itens sem sobreposição', () => {
    const items = toCalendarItems(
      [buildEvent({ id: 'e1', dataInicio: new Date('2026-08-18T19:00:00Z'), dataFim: new Date('2026-08-18T20:00:00Z') })],
      [buildPersonalEvent({ id: 'pe1', dataInicio: new Date('2026-08-18T21:00:00Z'), dataFim: new Date('2026-08-18T22:00:00Z') })],
      [],
    );

    expect(detectOverlaps(items).size).toBe(0);
  });

  it('ignora aniversários na detecção de conflito', () => {
    const items = toCalendarItems(
      [
        buildEvent({
          id: 'e1',
          tipo: 'aniversario',
          dataInicio: new Date('2026-08-18T00:00:00Z'),
          dataFim: new Date('2026-08-18T23:59:00Z'),
        }),
      ],
      [buildPersonalEvent({ id: 'pe1', dataInicio: new Date('2026-08-18T10:00:00Z'), dataFim: new Date('2026-08-18T11:00:00Z') })],
      [],
    );

    expect(detectOverlaps(items).size).toBe(0);
  });

  it('ignora eventos VL6 sem dataFim definida (sessão sem horário de encerramento)', () => {
    const items = toCalendarItems(
      [
        buildEvent({
          id: 'e1',
          dataInicio: new Date('2026-08-18T20:00:00Z'),
          dataFim: null,
        }),
      ],
      [buildPersonalEvent({ id: 'pe1', dataInicio: new Date('2026-08-18T20:30:00Z'), dataFim: new Date('2026-08-18T21:00:00Z') })],
      [],
    );

    expect(detectOverlaps(items).size).toBe(0);
  });
});
