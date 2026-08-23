export const ARCHIVE_SEARCH_KINDS = ['documento', 'biblioteca', 'fotografia', 'evento'] as const;
export type ArchiveSearchKind = (typeof ARCHIVE_SEARCH_KINDS)[number];

export const ARCHIVE_SEARCH_KIND_LABELS: Record<ArchiveSearchKind, string> = {
  documento: 'Documento',
  biblioteca: 'Biblioteca',
  fotografia: 'Foto/Vídeo',
  /** `ArchiveItem` do Acervo novo (Fases 1-5) — álbum publicado de um Evento, distinto do `GalleryAlbum` legado (kind `fotografia`). */
  evento: 'Evento',
};

export interface ArchiveSearchResult {
  id: string;
  kind: ArchiveSearchKind;
  title: string;
  description: string;
  href: string;
  /**
   * ID composto do "Item do Acervo" (`archive-item-id.ts`) para este
   * resultado — usado pelo seletor de itens de Coleções/Exposições (Fase
   * D) para montar `itemIds` sem adivinhar o kind a partir de `href` (que,
   * para `kind: 'evento'`, aponta para `/acervo/eventos/[eventId]`, não
   * para `/acervo/item/[id]`).
   */
  compositeId: string;
  createdAt: Date;
  /**
   * Texto complementar que entra no casamento de busca mas nunca é
   * exibido — ficha de catalogação publicada (Estágio 6) para itens
   * legados, ou legendas (`ArchiveMedia.caption`) das mídias publicadas
   * para itens do Acervo novo (Fase A "Pessoas & Descoberta", item 2 do
   * escopo — mesmo padrão de "texto extra só para busca").
   */
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
