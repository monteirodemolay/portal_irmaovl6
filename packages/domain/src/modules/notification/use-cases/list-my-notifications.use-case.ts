import type { AuthContext } from '../../../shared/auth-context';
import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { Notification } from '../entities/notification.entity';
import type { INotificationRepository } from '../repositories/notification.repository';

export interface ListMyNotificationsDeps {
  notificationRepository: INotificationRepository;
}

/** Ação pessoal — sem `requirePermission`, o critério é ser o destinatário. */
export class ListMyNotificationsUseCase {
  constructor(private readonly deps: ListMyNotificationsDeps) {}

  async execute(ctx: AuthContext, page: PageRequest): Promise<PageResult<Notification>> {
    return this.deps.notificationRepository.listByRecipient(ctx.tenantId, ctx.uid, page);
  }
}
