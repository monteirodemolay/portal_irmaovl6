import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ForbiddenError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Notification } from '../entities/notification.entity';
import type { INotificationRepository } from '../repositories/notification.repository';

export interface MarkNotificationAsReadDeps {
  notificationRepository: INotificationRepository;
  clock: IClock;
}

/** Ação pessoal — apenas o próprio destinatário pode marcar como lida. */
export class MarkNotificationAsReadUseCase {
  constructor(private readonly deps: MarkNotificationAsReadDeps) {}

  async execute(ctx: AuthContext, notificationId: string): Promise<Result<Notification>> {
    const notification = await this.deps.notificationRepository.findById(notificationId);
    if (!notification || notification.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Notification', notificationId));
    }
    if (notification.destinatarioId !== ctx.uid) {
      return err(new ForbiddenError('notification:read-own'));
    }

    const updated: Notification = {
      ...notification,
      lida: true,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.notificationRepository.update(updated);

    return ok(updated);
  }
}
