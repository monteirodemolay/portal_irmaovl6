import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ForbiddenError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Notification } from '../entities/notification.entity';
import type { INotificationRepository } from '../repositories/notification.repository';

export interface MarkNotificationAsUnreadDeps {
  notificationRepository: INotificationRepository;
  clock: IClock;
}

/**
 * Simétrico a `MarkNotificationAsReadUseCase` — a Central de Avisos permite
 * devolver um item lido pra "Não lidas" (ex.: pra tratar depois), inclusive
 * fazendo-o reaparecer no card da Dashboard.
 */
export class MarkNotificationAsUnreadUseCase {
  constructor(private readonly deps: MarkNotificationAsUnreadDeps) {}

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
      lida: false,
      readAt: null,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.notificationRepository.update(updated);

    return ok(updated);
  }
}
