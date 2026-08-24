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
  create(notification: Notification): Promise<void>;
  update(notification: Notification): Promise<void>;
}
