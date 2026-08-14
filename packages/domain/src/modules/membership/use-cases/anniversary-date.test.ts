import { describe, expect, it } from 'vitest';
import { computeNextOccurrence } from './anniversary-date';

describe('computeNextOccurrence', () => {
  it('retorna 0 dias quando a ocorrência é hoje', () => {
    const result = computeNextOccurrence(new Date('2026-03-12'), new Date('2015-03-12'));
    expect(result.diasAte).toBe(0);
    expect(result.anosCompletos).toBe(11);
  });

  it('calcula dias restantes quando a ocorrência ainda não passou este ano', () => {
    const result = computeNextOccurrence(new Date('2026-03-12'), new Date('2015-03-15'));
    expect(result.diasAte).toBe(3);
    expect(result.anosCompletos).toBe(11);
  });

  it('rola para o ano seguinte quando a ocorrência deste ano já passou', () => {
    const result = computeNextOccurrence(new Date('2026-03-12'), new Date('2015-03-10'));
    expect(result.diasAte).toBeGreaterThan(300);
    expect(result.anosCompletos).toBe(12);
  });

  it('trata 29/fev mapeando para 28/fev em ano não bissexto', () => {
    const result = computeNextOccurrence(new Date('2026-02-25'), new Date('2016-02-29'));
    expect(result.diasAte).toBe(3);
    expect(result.anosCompletos).toBe(10);
  });

  it('trata a virada de dezembro para janeiro corretamente', () => {
    const result = computeNextOccurrence(new Date('2026-12-30'), new Date('2010-01-02'));
    expect(result.diasAte).toBe(3);
    expect(result.anosCompletos).toBe(17);
  });
});
