import { describe, expect, it } from 'vitest';
import { computeNextOccurrence } from './anniversary-date';

/**
 * Meio-dia UTC, nunca meia-noite — `computeNextOccurrence` lê "hoje" no
 * calendário de São Paulo (`todayInBrazil`, UTC-3), então meia-noite UTC
 * ("2026-03-12T00:00:00Z", o que `new Date('2026-03-12')` produz) já é
 * 21h do dia anterior em São Paulo. Meio-dia UTC nunca cruza essa virada
 * de fuso, então representa o mesmo dia-calendário nos dois fusos — é
 * assim que `IClock.now()` (`new Date()`, um instante real) se comporta
 * na prática, ao contrário de uma string de data pura.
 */
function noonUtc(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00.000Z`);
}

describe('computeNextOccurrence', () => {
  it('retorna 0 dias quando a ocorrência é hoje', () => {
    const result = computeNextOccurrence(noonUtc('2026-03-12'), new Date('2015-03-12'));
    expect(result.diasAte).toBe(0);
    expect(result.anosCompletos).toBe(11);
    expect(result.dia).toBe(12);
    expect(result.mes).toBe(3);
  });

  it('calcula dias restantes quando a ocorrência ainda não passou este ano', () => {
    const result = computeNextOccurrence(noonUtc('2026-03-12'), new Date('2015-03-15'));
    expect(result.diasAte).toBe(3);
    expect(result.anosCompletos).toBe(11);
  });

  it('rola para o ano seguinte quando a ocorrência deste ano já passou', () => {
    const result = computeNextOccurrence(noonUtc('2026-03-12'), new Date('2015-03-10'));
    expect(result.diasAte).toBeGreaterThan(300);
    expect(result.anosCompletos).toBe(12);
  });

  it('trata 29/fev mapeando para 28/fev em ano não bissexto', () => {
    const result = computeNextOccurrence(noonUtc('2026-02-25'), new Date('2016-02-29'));
    expect(result.diasAte).toBe(3);
    expect(result.anosCompletos).toBe(10);
    expect(result.dia).toBe(28);
    expect(result.mes).toBe(2);
  });

  it('trata a virada de dezembro para janeiro corretamente', () => {
    const result = computeNextOccurrence(noonUtc('2026-12-30'), new Date('2010-01-02'));
    expect(result.diasAte).toBe(3);
    expect(result.anosCompletos).toBe(17);
  });

  it('lê "hoje" no calendário de São Paulo, não no dia UTC — meia-noite UTC ainda é o dia anterior às 21h em São Paulo', () => {
    // 2026-09-22T00:00:00Z = 2026-09-21T21:00:00-03:00 (véspera, São Paulo)
    const meiaNoiteUtc = new Date('2026-09-22T00:00:00.000Z');
    const result = computeNextOccurrence(meiaNoiteUtc, new Date('1963-09-22'));
    // Se "hoje" fosse lido pelo dia UTC (22/09), a ocorrência de 22/09 seria
    // "hoje" (0 dias); no calendário de São Paulo (21/09), ainda falta 1 dia.
    expect(result.diasAte).toBe(1);
    // A ocorrência em si continua sendo 22/09 — só a contagem de dias muda.
    expect(result.dia).toBe(22);
    expect(result.mes).toBe(9);
  });
});
