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
}
