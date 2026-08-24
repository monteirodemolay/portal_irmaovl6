import type { IClock } from '../../../shared/ports';
import type { INotificationRepository } from '../repositories/notification.repository';

export interface ArchiveExpiredNotificationsDeps {
  notificationRepository: INotificationRepository;
  clock: IClock;
}

/**
 * Job diário (Vercel Cron) — arquiva automaticamente toda notificação com
 * `expiresAt` vencido ainda não arquivada, um tenant por vez (a rota de
 * cron varre os tenants). Idempotente por natureza: rodar de novo no
 * mesmo dia só re-arquiva quem já está arquivado (`archivedAt` some da
 * consulta), nunca duplica nada.
 */
export class ArchiveExpiredNotificationsUseCase {
  constructor(private readonly deps: ArchiveExpiredNotificationsDeps) {}

  async execute(tenantId: string): Promise<number> {
    const now = this.deps.clock.now();
    const expired = await this.deps.notificationRepository.listExpiringUnarchived(tenantId, now);

    await Promise.all(
      expired.map((notification) =>
        this.deps.notificationRepository.update({
          ...notification,
          archivedAt: now,
          updatedAt: now,
          updatedBy: 'system',
        }),
      ),
    );

    return expired.length;
  }
}
