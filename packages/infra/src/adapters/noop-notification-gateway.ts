import type { INotificationGateway, Notification } from '@vl6/domain';

/**
 * Implementação provisória de `INotificationGateway` — os canais externos
 * (email/push/whatsapp/telegram) ainda não têm adapter real (docs/
 * architecture/06 §6.8, roadmap doc 10). Não falha silenciosamente: registra
 * a tentativa para facilitar diagnóstico até o adapter real ser plugado.
 */
export class NoopNotificationGateway implements INotificationGateway {
  async send(notification: Notification): Promise<void> {
    console.warn(
      `[NoopNotificationGateway] envio via '${notification.canal}' ainda não implementado (notificação ${notification.id}).`,
    );
  }
}
