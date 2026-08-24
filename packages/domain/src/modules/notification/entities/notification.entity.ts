import type { NotificationChannel, NotificationPriority, NotificationType } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Central de Avisos (docs/architecture) — `lida`/`readAt` convivem
 * deliberadamente: `lida` é o campo original (mantido por compatibilidade),
 * `readAt` é a data efetiva de leitura, sempre atualizados juntos a partir
 * daqui. `dedupeKey` é a chave de idempotência das automações (ex.:
 * `event:{eventId}:day-of:{data}:user:{userId}`) — nunca nulo quando a
 * notificação nasce de um job agendado, permite reexecução segura do Cron.
 */
export interface Notification extends BaseEntity {
  destinatarioId: string;
  tipo: NotificationType;
  titulo: string;
  mensagem: string;
  lida: boolean;
  readAt: Date | null;
  canal: NotificationChannel;
  link: string | null;
  priority: NotificationPriority;
  important: boolean;
  archivedAt: Date | null;
  requiresAcknowledgement: boolean;
  acknowledgedAt: Date | null;
  expiresAt: Date | null;
  actionLabel: string | null;
  dedupeKey: string | null;
}
