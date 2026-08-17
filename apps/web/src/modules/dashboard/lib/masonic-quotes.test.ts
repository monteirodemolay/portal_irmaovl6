import { describe, expect, it } from 'vitest';
import { MASONIC_QUOTES, pickDailyQuote } from './masonic-quotes';

describe('MASONIC_QUOTES', () => {
  it('tem cerca de 100 frases, todas com texto e autor', () => {
    expect(MASONIC_QUOTES.length).toBeGreaterThanOrEqual(100);
    for (const quote of MASONIC_QUOTES) {
      expect(quote.text.length).toBeGreaterThan(0);
      expect(quote.author.length).toBeGreaterThan(0);
    }
  });
});

describe('pickDailyQuote', () => {
  it('é determinística: mesmo dia devolve sempre a mesma frase', () => {
    const a = pickDailyQuote(new Date('2026-08-17T13:00:00Z'));
    const b = pickDailyQuote(new Date('2026-08-17T23:00:00Z'));
    expect(a).toEqual(b);
  });

  it('varia entre dias diferentes', () => {
    const day1 = pickDailyQuote(new Date('2026-08-17T13:00:00Z'));
    const day2 = pickDailyQuote(new Date('2026-08-18T13:00:00Z'));
    expect(day1).not.toEqual(day2);
  });
});
