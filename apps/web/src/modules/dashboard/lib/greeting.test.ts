import { describe, expect, it } from 'vitest';
import { timeOfDayGreeting } from './greeting';

// Horários em UTC — Brasília é UTC-3 (sem horário de verão desde 2019).
describe('timeOfDayGreeting', () => {
  it('retorna "Bom dia" pela manhã (08h em São Paulo)', () => {
    expect(timeOfDayGreeting(new Date('2026-08-17T11:00:00Z'))).toBe('Bom dia');
  });

  it('retorna "Boa tarde" à tarde (14h em São Paulo)', () => {
    expect(timeOfDayGreeting(new Date('2026-08-17T17:00:00Z'))).toBe('Boa tarde');
  });

  it('retorna "Boa noite" à noite (20h em São Paulo)', () => {
    expect(timeOfDayGreeting(new Date('2026-08-17T23:00:00Z'))).toBe('Boa noite');
  });

  it('retorna "Boa noite" de madrugada (2h em São Paulo)', () => {
    expect(timeOfDayGreeting(new Date('2026-08-17T05:00:00Z'))).toBe('Boa noite');
  });
});
