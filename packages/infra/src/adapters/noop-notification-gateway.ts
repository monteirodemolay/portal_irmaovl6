import type { INotificationGateway, Notification } from '@vl6/domain';
import { logger } from '@vl6/shared';

/**
 * Implementação provisória de `INotificationGateway` — os canais externos
 * (email/push/whatsapp/telegram) ainda não têm adapter real (docs/
 * architecture/06 §6.8, roadmap doc 10). Não falha silenciosamente: registra
 * a tentativa para facilitar diagnóstico até o adapter real ser plugado.
 */
export class NoopNotificationGateway implements INotificationGateway {
  async send(notification: Notification): Promise<void> {
    logger.warn('Canal de notificação ainda não implementado', {
      canal: notification.canal,
      notificationId: notification.id,
    });
  }
}
