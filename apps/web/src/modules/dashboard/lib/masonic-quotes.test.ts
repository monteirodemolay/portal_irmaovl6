import { describe, expect, it } from 'vitest';
import { MASONIC_QUOTES, pickQuote, type MasonicQuote } from './masonic-quotes';

describe('MASONIC_QUOTES', () => {
  it('tem cerca de 100 frases, todas com texto e autor', () => {
    expect(MASONIC_QUOTES.length).toBeGreaterThanOrEqual(100);
    for (const quote of MASONIC_QUOTES) {
      expect(quote.text.length).toBeGreaterThan(0);
      expect(quote.author.length).toBeGreaterThan(0);
    }
  });
});

const customQuotes: MasonicQuote[] = [
  { text: 'Frase 1', author: 'Irmão 1' },
  { text: 'Frase 2', author: 'Irmão 2' },
  { text: 'Frase 3', author: 'Irmão 3' },
];

describe('pickQuote', () => {
  it('modo diaria: é determinística no mesmo dia e varia entre dias diferentes', () => {
    const a = pickQuote(customQuotes, { modo: 'diaria', intervaloMinutos: null }, new Date('2026-08-17T13:00:00Z'));
    const b = pickQuote(customQuotes, { modo: 'diaria', intervaloMinutos: null }, new Date('2026-08-17T23:00:00Z'));
    expect(a).toEqual(b);

    const day2 = pickQuote(customQuotes, { modo: 'diaria', intervaloMinutos: null }, new Date('2026-08-18T13:00:00Z'));
    expect(day2).not.toEqual(a);
  });

  it('modo intervalo: é determinística dentro da mesma janela e muda entre janelas', () => {
    const settings = { modo: 'intervalo' as const, intervaloMinutos: 60 };
    const a = pickQuote(customQuotes, settings, new Date('2026-08-17T13:05:00Z'));
    const b = pickQuote(customQuotes, settings, new Date('2026-08-17T13:55:00Z'));
    expect(a).toEqual(b);

    const c = pickQuote(customQuotes, settings, new Date('2026-08-17T14:05:00Z'));
    expect(c).not.toEqual(a);
  });

  it('modo recarga: sempre devolve uma frase do pool', () => {
    const result = pickQuote(customQuotes, { modo: 'recarga', intervaloMinutos: null }, new Date());
    expect(customQuotes).toContainEqual(result);
  });

  it('usa o banco embutido como fallback quando não há frases cadastradas', () => {
    const result = pickQuote([], { modo: 'diaria', intervaloMinutos: null }, new Date('2026-08-17T13:00:00Z'));
    expect(MASONIC_QUOTES).toContainEqual(result);
  });
});
