import type { AccessLevel, ArchiveMediaStatus, ArchiveMediaTypeKey } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Vínculo entre um `ArchiveItem` e um `MediaAsset` — Fase 1 da Fundação do
 * Acervo VL6 (docs/architecture/11-acervo-vl6.md §11.5). `eventId` e
 * `boardTermId` nunca são aceitos como input direto de nenhum caso de uso:
 * são sempre herdados do `ArchiveItem` pai (`AttachMediaToArchiveItemUseCase`),
 * para impedir mídia "solta" sem o mesmo vínculo de proveniência do item.
 *
 * `publicacaoStatus` segue o mesmo motivo de `ArchiveItem.publicacaoStatus`
 * — ciclo de vida editorial distinto de `status`/`ativo` herdados de
 * `BaseEntity`.
 */
export interface ArchiveMedia extends BaseEntity {
  eventId: string;
  boardTermId: string | null;
  archiveItemId: string;
  mediaAssetId: string;
  mediaType: ArchiveMediaTypeKey;
  documentType: string | null;
  role: string | null;
  order: number;
  caption: string | null;
  altText: string | null;
  /** Unicidade garantida por `SetArchiveItemCoverUseCase` — só uma mídia por `archiveItemId` pode ter `isCover: true`. */
  isCover: boolean;
  isFeatured: boolean;
  accessLevel: AccessLevel;
  allowDownload: boolean;
  publicacaoStatus: ArchiveMediaStatus;
  /**
   * Fotógrafo/autor da mídia — Fase 2 da Central de Publicação
   * (docs/architecture/11-acervo-vl6.md §11.5). `null` até o painel de
   * metadados em lote (`UpdateArchiveMediaBatchUseCase`) preencher.
   */
  autor: string | null;
  /** Tags livres, mesmo padrão de `ArchiveCatalogEntry.tags` — preenchidas pelo painel de metadados em lote. */
  tags: string[];
  /**
   * IDs de `Member` marcados como identificados nesta mídia — Fase A
   * "Pessoas & Descoberta" (identificação manual pelo administrador na
   * Central de Publicação, NUNCA reconhecimento facial automático, ver
   * docs/architecture/11-acervo-vl6.md Etapa 4). Campo aditivo opcional,
   * mesmo padrão de `ArchiveItem.origemGalleryAlbumId` (Fase 5) — não
   * exige alteração em nenhum construtor de `ArchiveMedia` já existente;
   * ausente/`undefined` equivale a "ninguém identificado ainda" e deve
   * ser tratado como `[]` por quem lê.
   */
  pessoasIdentificadas?: string[];
}
