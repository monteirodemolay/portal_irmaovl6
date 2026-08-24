import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ok,
  err,
  type Result,
} from '../../../shared/result';
import type { Notification } from '../entities/notification.entity';
import type { INotificationRepository } from '../repositories/notification.repository';

export interface AcknowledgeNotificationDeps {
  notificationRepository: INotificationRepository;
  clock: IClock;
}

/**
 * Confirma ciência de um comunicado que exige (`requiresAcknowledgement`) —
 * registro separado da leitura (`lida`/`readAt`): o Irmão pode ter lido sem
 * ainda ter confirmado. Idempotente: confirmar de novo não é erro, mas
 * recusa notificações que nunca exigiram ciência.
 */
export class AcknowledgeNotificationUseCase {
  constructor(private readonly deps: AcknowledgeNotificationDeps) {}

  async execute(ctx: AuthContext, notificationId: string): Promise<Result<Notification>> {
    const notification = await this.deps.notificationRepository.findById(notificationId);
    if (!notification || notification.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Notification', notificationId));
    }
    if (notification.destinatarioId !== ctx.uid) {
      return err(new ForbiddenError('notification:read-own'));
    }
    if (!notification.requiresAcknowledgement) {
      return err(new ConflictError('Este comunicado não exige confirmação de ciência.'));
    }

    const now = this.deps.clock.now();
    const updated: Notification = {
      ...notification,
      acknowledgedAt: notification.acknowledgedAt ?? now,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.notificationRepository.update(updated);

    return ok(updated);
  }
}
