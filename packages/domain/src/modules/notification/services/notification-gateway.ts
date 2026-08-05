import type { Notification } from '../entities/notification.entity';

/**
 * Envio efetivo para canais externos (email/push/whatsapp/telegram).
 * Contrato pronto desde já; implementação adiada — docs/architecture/06
 * §6.8 e roadmap doc 10. O canal `interno` nunca passa por aqui: fica
 * resolvido apenas pela persistência da própria `Notification`.
 */
export interface INotificationGateway {
  send(notification: Notification): Promise<void>;
}
