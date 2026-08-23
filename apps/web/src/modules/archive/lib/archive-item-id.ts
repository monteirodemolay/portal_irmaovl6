/**
 * `archive-item` foi acrescentado na Fase D (docs/architecture/
 * 11-acervo-vl6.md) para os `ArchiveItem`s do Acervo novo (Fases 1-B da
 * Fundação, `packages/domain/.../archive-item.entity.ts`) poderem ser
 * referenciados por Coleções/Exposições junto dos 4 kinds legados —
 * `sourceId` aqui é o `ArchiveItem.id` real, resolvido contra
 * `archiveItems`/`archiveMedia` (nunca duplicado). Diferente do contra-
 * exemplo da Constelação de Relações (`load-relation-node-options.ts`, que
 * exclui o kind `evento` por já existir como node nativo `event`): aqui não
 * existe nó nativo prévio para um `ArchiveItem` dentro de uma Coleção, então
 * o ID composto é a abordagem certa.
 */
export const ARCHIVE_ITEM_KINDS = [
  'file',
  'library',
  'gallery-album',
  'gallery-media',
  'archive-item',
] as const;
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
 *
 * Separador `_`, não `:` — QA no emulador mostrou o navegador reescrevendo
 * `:` para `%3A` em navegação direta (mas não na interceptação client-side
 * do App Router, que reaproveita a string literal do `href`), quebrando o
 * acesso duplo página-cheia/prévia. `_` é caractere "unreserved" (RFC 3986)
 * e nunca é reescrito por navegador, proxy ou log — e não conflita com os
 * `kind` (hífen) nem com IDs do Firestore (base62, sem `_`).
 */
export function buildArchiveItemId(kind: ArchiveItemKind, sourceId: string): string {
  return `${kind}_${sourceId}`;
}

export function parseArchiveItemId(compositeId: string): ParsedArchiveItemId | null {
  const separatorIndex = compositeId.indexOf('_');
  if (separatorIndex <= 0) return null;

  const kind = compositeId.slice(0, separatorIndex);
  const sourceId = compositeId.slice(separatorIndex + 1);
  if (!sourceId || !ARCHIVE_ITEM_KINDS.includes(kind as ArchiveItemKind)) return null;

  return { kind: kind as ArchiveItemKind, sourceId };
}

export function archiveItemHref(kind: ArchiveItemKind, sourceId: string): string {
  return `/acervo/item/${buildArchiveItemId(kind, sourceId)}`;
}
