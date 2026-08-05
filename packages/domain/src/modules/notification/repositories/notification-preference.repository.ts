import type { NotificationPreference } from '../entities/notification-preference.entity';

export interface INotificationPreferenceRepository {
  findByUserId(tenantId: string, userId: string): Promise<NotificationPreference | null>;
  create(preference: NotificationPreference): Promise<void>;
  update(preference: NotificationPreference): Promise<void>;
}
