import type { NotificationChannel, NotificationType } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

export interface Notification extends BaseEntity {
  destinatarioId: string;
  tipo: NotificationType;
  titulo: string;
  mensagem: string;
  lida: boolean;
  canal: NotificationChannel;
  link: string | null;
}
