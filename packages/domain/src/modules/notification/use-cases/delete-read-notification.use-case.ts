import type { AuthContext } from '../../../shared/auth-context';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  ok,
  err,
  type Result,
} from '../../../shared/result';
import type { INotificationRepository } from '../repositories/notification.repository';

export interface DeleteReadNotificationDeps {
  notificationRepository: INotificationRepository;
}

/**
 * Exclusão pessoal — o próprio Irmão limpando o painel dele. Só notificações
 * já LIDAS podem ser excluídas individualmente (o que ainda pede atenção
 * não desaparece sem ser visto primeiro); é exclusão física de verdade
 * (ver `INotificationRepository.delete`), não `deletedAt` — o objetivo é
 * liberar espaço, notificação não é registro institucional.
 */
export class DeleteReadNotificationUseCase {
  constructor(private readonly deps: DeleteReadNotificationDeps) {}

  async execute(ctx: AuthContext, notificationId: string): Promise<Result<void>> {
    const notification = await this.deps.notificationRepository.findById(notificationId);
    if (!notification || notification.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Notification', notificationId));
    }
    if (notification.destinatarioId !== ctx.uid) {
      return err(new ForbiddenError('notification:delete-own'));
    }
    if (!notification.lida) {
      return err(new ValidationError('Só é possível excluir notificações já lidas.'));
    }

    await this.deps.notificationRepository.delete(notificationId);
    return ok(undefined);
  }
}
