import { describe, expect, it } from 'vitest';
import { formatRelativeDate, percentOf } from './dashboard-metrics';

describe('formatRelativeDate', () => {
  const now = new Date('2026-09-16T12:00:00Z');

  it('mostra "agora mesmo" pra menos de 1 minuto', () => {
    expect(formatRelativeDate(new Date('2026-09-16T11:59:40Z'), now)).toBe('agora mesmo');
  });

  it('mostra minutos pra menos de 1 hora', () => {
    expect(formatRelativeDate(new Date('2026-09-16T11:45:00Z'), now)).toBe('há 15 min');
  });

  it('mostra horas pra menos de 1 dia', () => {
    expect(formatRelativeDate(new Date('2026-09-16T09:00:00Z'), now)).toBe('há 3 h');
  });

  it('mostra "ontem" pra exatamente 1 dia', () => {
    expect(formatRelativeDate(new Date('2026-09-15T12:00:00Z'), now)).toBe('ontem');
  });

  it('mostra dias pra menos de 1 semana', () => {
    expect(formatRelativeDate(new Date('2026-09-13T12:00:00Z'), now)).toBe('há 3 dias');
  });

  it('cai pra data curta a partir de 1 semana', () => {
    const result = formatRelativeDate(new Date('2026-09-01T12:00:00Z'), now);
    expect(result).not.toMatch(/há \d+ dias|ontem|agora mesmo/);
  });
});

describe('percentOf', () => {
  it('calcula o percentual arredondado', () => {
    expect(percentOf(78, 236)).toBe(33);
  });

  it('nunca divide por zero — retorna 0 quando o total é 0', () => {
    expect(percentOf(5, 0)).toBe(0);
  });

  it('retorna 100 quando value === total', () => {
    expect(percentOf(50, 50)).toBe(100);
  });
});
