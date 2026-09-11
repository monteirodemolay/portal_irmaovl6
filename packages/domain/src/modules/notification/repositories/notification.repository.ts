import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { Notification } from '../entities/notification.entity';

export interface INotificationRepository {
  findById(id: string): Promise<Notification | null>;
  listByRecipient(
    tenantId: string,
    destinatarioId: string,
    page: PageRequest,
  ): Promise<PageResult<Notification>>;
  countUnreadByRecipient(tenantId: string, destinatarioId: string): Promise<number>;
  /** Idempotência das automações — nunca cria uma segunda notificação com o mesmo `dedupeKey`. */
  findByDedupeKey(tenantId: string, dedupeKey: string): Promise<Notification | null>;
  /** Job diário (`ArchiveExpiredNotificationsUseCase`) — `expiresAt` vencido e ainda não arquivada. */
  listExpiringUnarchived(tenantId: string, at: Date): Promise<Notification[]>;
  /** Todas as notificações nascidas de um mesmo disparo (`dedupeKey` com o mesmo prefixo) — relatório de alcance. */
  listByDedupeKeyPrefix(tenantId: string, prefix: string): Promise<Notification[]>;
  /** Já lidas do destinatário — base de "excluir notificações lidas" (individual ou em massa). */
  listReadByRecipient(tenantId: string, destinatarioId: string): Promise<Notification[]>;
  /** Job diário de expurgo (`PurgeExpiredNotificationsUseCase`) — arquivadas há mais tempo que a folga de retenção. */
  listArchivedBefore(tenantId: string, before: Date): Promise<Notification[]>;
  create(notification: Notification): Promise<void>;
  update(notification: Notification): Promise<void>;
  /**
   * Exclusão física de verdade — única exceção ao convite geral de
   * `BaseEntity` ("excluir" normalmente é `deletedAt`): notificação é dado
   * operacional efêmero, não registro institucional, e o objetivo explícito
   * daqui é liberar espaço/armazenamento, não preservar histórico.
   */
  delete(id: string): Promise<void>;
}
