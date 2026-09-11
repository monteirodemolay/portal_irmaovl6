import type { AuthContext } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import type { INotificationRepository } from '../repositories/notification.repository';

export interface DeleteAllReadNotificationsDeps {
  notificationRepository: INotificationRepository;
}

/**
 * "Excluir lidas" em massa — mesmo espírito de `DeleteReadNotificationUseCase`
 * (exclusão física, pessoal, só do que já foi lido), só que pro painel
 * inteiro de uma vez em vez de item por item.
 */
export class DeleteAllReadNotificationsUseCase {
  constructor(private readonly deps: DeleteAllReadNotificationsDeps) {}

  async execute(ctx: AuthContext): Promise<Result<number>> {
    const read = await this.deps.notificationRepository.listReadByRecipient(ctx.tenantId, ctx.uid);
    await Promise.all(read.map((n) => this.deps.notificationRepository.delete(n.id)));
    return ok(read.length);
  }
}
