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
  /**
   * `MediaAsset.id` da miniatura capturada no browser (frame do vídeo) —
   * Fase B "Publicação avançada". Só relevante quando `mediaType ===
   * 'video'`; registrado como um `MediaAsset` comum de imagem, mesmo fluxo
   * de `RegisterMediaAssetUseCase` usado para o binário principal
   * (`SetArchiveMediaPosterUseCase`). Campo aditivo opcional, mesmo padrão
   * de `pessoasIdentificadas` — ausente/`undefined`/`null` equivale a "sem
   * miniatura ainda" (o `<video>` mostra o primeiro frame por padrão).
   */
  posterMediaAssetId?: string | null;
  /**
   * Contador de visualizações — Fase C "Administração & métricas". Cada
   * requisição bem-sucedida ao binário principal via
   * `/api/archive-media/[archiveMediaId]` incrementa este campo
   * (`RecordArchiveMediaViewUseCase`), mesmo espírito de
   * `FileAsset.contagemVisualizacoes`/`LibraryItem.contagemVisualizacoes`.
   * Campo aditivo opcional — ausente/`undefined` equivale a `0` para quem
   * lê, mesmo padrão de `pessoasIdentificadas`.
   */
  contagemVisualizacoes?: number;
  /**
   * Ponto focal do recorte de exibição — percentuais 0-100 de `object-position`
   * (0,0 = canto superior esquerdo; 50,50 = centro, comportamento padrão).
   * Só faz sentido pra `mediaType === 'foto'`; toda superfície que exibe
   * esta mídia em `object-cover` (capa de evento, cards do Acervo, prévia
   * da Central de Publicação) usa o mesmo par de campos, pra nunca haver
   * dois recortes diferentes da mesma foto. Campo aditivo opcional, mesmo
   * padrão de `pessoasIdentificadas` — ausente/`undefined`/`null` equivale
   * a "sem ajuste", cai no centro (`object-position: 50% 50%`, o padrão
   * do navegador).
   */
  focalX?: number | null;
  focalY?: number | null;
}
