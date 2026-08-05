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
  create(notification: Notification): Promise<void>;
  update(notification: Notification): Promise<void>;
}
