import { describe, expect, it } from 'vitest';
import { matchSearchSuggestions, normalizeForSearch } from './normalize-for-search';
describe('Portal search normalization', () => {
  it.each([
    ['Luís Eduardo', 'luis eduardo'],
    ['JOÃO-Paulo', 'joao paulo'],
    ['A∴R∴L∴S∴ nº 06', 'a r l s n 06'],
    ['Circular 001/2026', 'circular 0012026'],
    ['  Sessão   Magna! ', 'sessao magna'],
    ['123.456.789-00', '12345678900'],
  ])('matches %s regardless of marks and separators', (actual, query) => {
    expect(normalizeForSearch(actual)).toBe(normalizeForSearch(query));
  });
  it('handles composed and decomposed text identically', () => {
    expect(normalizeForSearch('Joa\u0303o')).toBe(normalizeForSearch('João'));
  });
  it('supports empty and optional text', () => {
    expect(normalizeForSearch(null)).toBe('');
    expect(normalizeForSearch('!!!')).toBe('');
  });
  it('filters only the supplied authorized suggestions without changing display labels', () => {
    const source = [
      { label: 'Sessão Magna', href: '/acervo/eventos/1' },
      { label: 'João-Paulo', href: '/irmaos/2' },
    ];
    expect(matchSearchSuggestions(source, 'sessao')[0]?.label).toBe('Sessão Magna');
    expect(matchSearchSuggestions(source, 'joao paulo')[0]?.href).toBe('/irmaos/2');
    expect(matchSearchSuggestions(source, '')).toEqual([]);
    expect(matchSearchSuggestions(source, '!!!')).toEqual([]);
    expect(source).toHaveLength(2);
  });
});
