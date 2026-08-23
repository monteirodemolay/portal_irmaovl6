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
}
