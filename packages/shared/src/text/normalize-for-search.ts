/** Search-only key. Never change stored names, identifiers or displayed text. */
export function normalizeForSearch(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/[ºª]/g, '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export interface SearchSuggestion {
  label: string;
  href: string;
  text?: string;
}

export function matchSearchSuggestions(items: SearchSuggestion[], query: string, limit = 6) {
  const key = normalizeForSearch(query);
  if (!key) return [];
  return items
    .filter((item) => normalizeForSearch(`${item.label} ${item.text ?? ''}`).includes(key))
    .slice(0, limit);
}
