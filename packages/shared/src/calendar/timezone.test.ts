import { describe, expect, it } from 'vitest';
import { parseBrazilDateTimeLocal } from './timezone';

describe('parseBrazilDateTimeLocal', () => {
  it('interpreta o valor "ingênuo" de um datetime-local como hora de Brasília (UTC-3)', () => {
    const date = parseBrazilDateTimeLocal('2026-08-24T20:00');
    expect(date.toISOString()).toBe('2026-08-24T23:00:00.000Z');
  });

  it('funciona igual independente do horário do dia', () => {
    const date = parseBrazilDateTimeLocal('2026-01-01T00:30');
    expect(date.toISOString()).toBe('2026-01-01T03:30:00.000Z');
  });
});
