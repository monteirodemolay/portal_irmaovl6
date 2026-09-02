import type { AccessLevel, ArchiveItemStatus, ArchiveItemTypeKey } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Item do Acervo — Fase 1 da Fundação do Acervo VL6 (docs/architecture/
 * 11-acervo-vl6.md §11.5, `archiveItems`). Ainda não é a catalogação
 * formal completa (que também trará `archiveTags`/`archiveAccessPolicies`/
 * `catalogingHistory` em fases futuras); aqui só o núcleo mínimo, que já
 * vincula todo item a um Evento e, quando identificável, à Gestão vigente
 * na data do evento.
 *
 * Regra de negócio central: todo `ArchiveItem` exige um `eventId` de um
 * evento existente do mesmo tenant — nunca existe item "solto" sem
 * proveniência (`CreateArchiveItemUseCase`).
 *
 * `publicacaoStatus` é o ciclo de vida editorial do item (rascunho →
 * publicado), distinto de `status`/`ativo` herdados de `BaseEntity` (que
 * seguem soft delete/lixeira) — mesmo padrão de
 * `ArchiveContribution.moderacaoStatus`.
 */
export interface ArchiveItem extends BaseEntity {
  eventId: string;
  boardTermId: string | null;
  titulo: string;
  tipo: ArchiveItemTypeKey;
  descricao: string | null;
  publicacaoStatus: ArchiveItemStatus;
  nivelAcesso: AccessLevel;
  /** `ArchiveMedia.id` marcada como capa (`SetArchiveItemCoverUseCase`) — `null` até a primeira mídia ser anexada. */
  capaMediaId: string | null;
  /**
   * `GalleryAlbum.id` de origem quando este item nasceu de uma migração
   * assistida da Galeria legada — Fase 5 (docs/architecture/
   * 11-acervo-vl6.md §11.6e, `MigrateGalleryAlbumUseCase`). Campo opcional
   * para não exigir alteração em todo construtor de `ArchiveItem` já
   * existente (Fases 1-4); ausente/`null` para todo item criado pelos
   * fluxos normais. Também serve de marcador de idempotência: a tela de
   * migração usa a presença de um `ArchiveItem` com este campo apontando
   * para um álbum para não listá-lo de novo como pendente — o
   * `GalleryAlbum`/`GalleryMedia` original nunca é alterado ou marcado
   * (Regra de Preservação).
   */
  origemGalleryAlbumId?: string | null;
  /**
   * `FileAsset.id` de origem quando este item nasceu de uma migração
   * assistida de Arquivos legado — Fase C "Administração & métricas"
   * (`MigrateFileAssetUseCase`). Mesmo papel de `origemGalleryAlbumId`:
   * marcador de idempotência da tela de migração, nunca um sinal de
   * alteração do `FileAsset` original (Regra de Preservação).
   */
  origemFileAssetId?: string | null;
  /**
   * `LibraryItem.id` de origem quando este item nasceu de uma migração
   * assistida da Biblioteca legada — Fase C "Administração & métricas"
   * (`MigrateLibraryItemUseCase`). Mesmo papel de
   * `origemGalleryAlbumId`/`origemFileAssetId`.
   */
  origemLibraryItemId?: string | null;
  /**
   * `Member.id` de origem quando este item nasceu automaticamente do
   * registro da data de iniciação de um Irmão
   * (`CreateInitiationArchiveItemUseCase`, chamado tanto no cadastro/edição
   * do Irmão quanto retroativamente por `SeedInitiationArchiveItemsUseCase`)
   * — não é uma migração de outro módulo do Acervo, mas cumpre o mesmo
   * papel duplo de `origemGalleryAlbumId`/`origemFileAssetId`/
   * `origemLibraryItemId`: marcador de idempotência (nunca cria um segundo
   * item de iniciação para o mesmo Irmão —
   * `IArchiveItemRepository.findByOrigemIniciacaoMemberId`) e rastro de
   * proveniência. O `Member` de origem nunca é alterado por esta criação
   * (Regra de Preservação). Campo aditivo opcional para não exigir
   * alteração em todo construtor de `ArchiveItem` já existente, mesmo
   * padrão de `origemGalleryAlbumId`.
   */
  origemIniciacaoMemberId?: string | null;
  /**
   * Data/hora futura para publicação automática — Fase B "Publicação
   * avançada" (`ScheduleArchiveItemPublicationUseCase`,
   * `PublishScheduledArchiveItemsUseCase`). `null` (padrão) para todo item
   * criado pelos fluxos normais e para todo item já publicado manualmente;
   * só é aceito quando o item está sem pendências de publicação
   * (`getArchiveItemPublicationBlockers`) — a mesma regra da publicação
   * imediata, só adiada no tempo. Campo opcional para não exigir alteração
   * em todo construtor de `ArchiveItem` já existente (Fases 1-3), mesmo
   * padrão de `origemGalleryAlbumId`.
   */
  publicarEm?: Date | null;
  /**
   * Contador de visualizações — Fase C "Administração & métricas". Somado a
   * partir das visualizações de cada `ArchiveMedia` do item
   * (`RecordArchiveMediaViewUseCase`, chamado pelo proxy autenticado
   * `/api/archive-media/[archiveMediaId]`), mesmo espírito de
   * `FileAsset.contagemVisualizacoes`/`LibraryItem.contagemVisualizacoes`.
   * Campo aditivo opcional — ausente/`undefined` equivale a `0` para quem lê
   * (mesmo padrão de `pessoasIdentificadas` em `ArchiveMedia`).
   */
  contagemVisualizacoes?: number;
  /**
   * URL do post no Instagram onde este mesmo conteúdo também foi
   * divulgado — puro registro institucional (nunca publica nada
   * automaticamente na rede social), editável no passo "Publicação" da
   * Central de Publicação depois que o item já foi publicado no Portal.
   * Campo aditivo opcional, mesmo padrão de `origemGalleryAlbumId` —
   * ausente/`undefined`/`null` equivale a "não divulgado lá (ainda)".
   */
  instagramUrl?: string | null;
}
