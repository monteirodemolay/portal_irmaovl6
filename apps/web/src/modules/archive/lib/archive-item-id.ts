export const ARCHIVE_ITEM_KINDS = ['file', 'library', 'gallery-album', 'gallery-media'] as const;
export type ArchiveItemKind = (typeof ARCHIVE_ITEM_KINDS)[number];

export interface ParsedArchiveItemId {
  kind: ArchiveItemKind;
  sourceId: string;
}

/**
 * ID de compatibilidade usado por `/acervo/item/[id]` enquanto a coleção
 * `archiveItems` (Etapa 2 da evolução do Acervo, ver
 * docs/architecture/11-acervo-vl6.md) ainda não existe: em vez de duplicar
 * `FileAsset`/`LibraryItem`/`GalleryAlbum`/`GalleryMedia`, a página resolve
 * o registro de origem a partir do prefixo. Quando a catalogação existir, o
 * `id` canônico passa a ser o `archiveItems.id`, com este formato guardado
 * em `origemId` — nenhuma URL composta atual deixa de funcionar.
 */
export function buildArchiveItemId(kind: ArchiveItemKind, sourceId: string): string {
  return `${kind}:${sourceId}`;
}

export function parseArchiveItemId(compositeId: string): ParsedArchiveItemId | null {
  const separatorIndex = compositeId.indexOf(':');
  if (separatorIndex <= 0) return null;

  const kind = compositeId.slice(0, separatorIndex);
  const sourceId = compositeId.slice(separatorIndex + 1);
  if (!sourceId || !ARCHIVE_ITEM_KINDS.includes(kind as ArchiveItemKind)) return null;

  return { kind: kind as ArchiveItemKind, sourceId };
}

export function archiveItemHref(kind: ArchiveItemKind, sourceId: string): string {
  return `/acervo/item/${buildArchiveItemId(kind, sourceId)}`;
}
