import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ForbiddenError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Notification } from '../entities/notification.entity';
import type { INotificationRepository } from '../repositories/notification.repository';

export interface ToggleNotificationArchivedDeps {
  notificationRepository: INotificationRepository;
  clock: IClock;
}

/**
 * Ação pessoal — arquiva/restaura na Central de Avisos. Diferente de
 * `deletedAt` (soft delete real): arquivar é reversível pelo próprio
 * destinatário e nunca some da aba "Arquivadas".
 */
export class ToggleNotificationArchivedUseCase {
  constructor(private readonly deps: ToggleNotificationArchivedDeps) {}

  async execute(ctx: AuthContext, notificationId: string): Promise<Result<Notification>> {
    const notification = await this.deps.notificationRepository.findById(notificationId);
    if (!notification || notification.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Notification', notificationId));
    }
    if (notification.destinatarioId !== ctx.uid) {
      return err(new ForbiddenError('notification:read-own'));
    }

    const now = this.deps.clock.now();
    const updated: Notification = {
      ...notification,
      archivedAt: notification.archivedAt ? null : now,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.notificationRepository.update(updated);

    return ok(updated);
  }
}
