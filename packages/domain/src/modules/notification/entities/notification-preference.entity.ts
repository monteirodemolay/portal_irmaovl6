import type { NotificationChannel } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

export interface NotificationPreference extends BaseEntity {
  userId: string;
  canaisHabilitados: NotificationChannel[];
}
