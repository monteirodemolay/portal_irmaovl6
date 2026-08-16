import type { ArchiveCatalogEntry } from '@vl6/domain';

/**
 * Vocabulário de tags já usadas nas fichas de catalogação (Estágio 6),
 * deduplicado por comparação case-insensitive (preserva a primeira grafia
 * encontrada) — apoia a "revisão humana" contra duplicidade de tags
 * (ex.: "Sessão Magna" vs "sessão magna") sem qualquer correspondência
 * automática ou fuzzy.
 */
export function collectDistinctTags(entries: ArchiveCatalogEntry[]): string[] {
  const seen = new Map<string, string>();
  for (const entry of entries) {
    for (const tag of entry.tags) {
      const key = tag.toLowerCase();
      if (!seen.has(key)) seen.set(key, tag);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
