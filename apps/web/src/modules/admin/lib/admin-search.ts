import { normalizeForSearch } from '@vl6/shared';

export interface AdminSearchHit {
  /** Identidade estável para a lista (tipo + destino). */
  id: string;
  kind: 'Ferramenta' | 'Seção do Portal' | 'Irmão' | 'Acontecimento' | 'Notícia';
  title: string;
  detail?: string;
  href: string;
}

export interface LocalSearchSource {
  kind: AdminSearchHit['kind'];
  title: string;
  detail?: string;
  href: string;
  /** Termos extras (sinônimos) que também encontram o item. */
  keywords?: string[];
}

export const MIN_RECORD_QUERY = 2;

/**
 * Busca instantânea em memória sobre ferramentas e seções do Portal.
 * Ordem: título começa com o termo > título contém > só detalhe/sinônimo.
 */
export function searchLocal(
  sources: LocalSearchSource[],
  query: string,
  limit = 8,
): AdminSearchHit[] {
  const needle = normalizeForSearch(query.trim());
  if (!needle) return [];
  const ranked: { score: number; source: LocalSearchSource }[] = [];
  for (const source of sources) {
    const title = normalizeForSearch(source.title);
    const rest = normalizeForSearch([source.detail ?? '', ...(source.keywords ?? [])].join(' '));
    const score = title.startsWith(needle)
      ? 0
      : title.includes(needle)
        ? 1
        : rest.includes(needle)
          ? 2
          : -1;
    if (score >= 0) ranked.push({ score, source });
  }
  return ranked
    .sort((a, b) => a.score - b.score || a.source.title.localeCompare(b.source.title, 'pt-BR'))
    .slice(0, limit)
    .map(({ source }) => ({
      id: `${source.kind}:${source.href}:${source.title}`,
      kind: source.kind,
      title: source.title,
      detail: source.detail,
      href: source.href,
    }));
}

/** Filtra registros já carregados por título, preservando a ordem recebida. */
export function filterByTitle<T>(
  items: T[],
  query: string,
  title: (item: T) => string,
  limit = 5,
): T[] {
  const needle = normalizeForSearch(query.trim());
  if (!needle) return [];
  return items.filter((item) => normalizeForSearch(title(item)).includes(needle)).slice(0, limit);
}
