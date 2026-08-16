export const ARCHIVE_SEARCH_KINDS = ['documento', 'biblioteca', 'fotografia'] as const;
export type ArchiveSearchKind = (typeof ARCHIVE_SEARCH_KINDS)[number];

export const ARCHIVE_SEARCH_KIND_LABELS: Record<ArchiveSearchKind, string> = {
  documento: 'Documento',
  biblioteca: 'Biblioteca',
  fotografia: 'Foto/Vídeo',
};

export interface ArchiveSearchResult {
  id: string;
  kind: ArchiveSearchKind;
  title: string;
  description: string;
  href: string;
  createdAt: Date;
  /** Texto da ficha de catalogação publicada (Estágio 6), quando existe — entra na busca mas não é exibido. */
  catalogText: string | null;
}

/**
 * Funções puras de casamento de busca, separadas de `search-archive.ts`
 * (que tem `server-only` e por isso não pode ser importado em testes
 * unitários fora de um Server Component) — mesma convenção de
 * `archive-item-id.ts`.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function matchesArchiveSearch(result: ArchiveSearchResult, query: string): boolean {
  if (!query) return true;
  const haystack = normalizeSearchText(
    `${result.title} ${result.description} ${ARCHIVE_SEARCH_KIND_LABELS[result.kind]} ${result.catalogText ?? ''}`,
  );
  return haystack.includes(normalizeSearchText(query));
}
