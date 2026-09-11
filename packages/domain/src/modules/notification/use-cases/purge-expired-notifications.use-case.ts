import type { IClock } from '../../../shared/ports';
import type { INotificationRepository } from '../repositories/notification.repository';

export interface PurgeExpiredNotificationsDeps {
  notificationRepository: INotificationRepository;
  clock: IClock;
}

/** Dias de folga entre arquivar (`ArchiveExpiredNotificationsUseCase`) e apagar de verdade — dá tempo do Irmão ainda ver o item arquivado antes dele sumir. */
export const PURGE_GRACE_PERIOD_DAYS = 7;

/**
 * Job diário (Vercel Cron) — a segunda metade do ciclo de vida iniciado por
 * `ArchiveExpiredNotificationsUseCase`: depois que uma notificação vencida
 * fica arquivada por `PURGE_GRACE_PERIOD_DAYS` dias, apaga de verdade
 * (exclusão física — notificação é dado operacional efêmero, o objetivo
 * aqui é liberar espaço no banco, não preservar histórico). Idempotente:
 * rodar de novo só encontra o que ainda não foi apagado.
 */
export class PurgeExpiredNotificationsUseCase {
  constructor(private readonly deps: PurgeExpiredNotificationsDeps) {}

  async execute(tenantId: string): Promise<number> {
    const now = this.deps.clock.now();
    const cutoff = new Date(now.getTime() - PURGE_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const toPurge = await this.deps.notificationRepository.listArchivedBefore(tenantId, cutoff);

    await Promise.all(toPurge.map((n) => this.deps.notificationRepository.delete(n.id)));

    return toPurge.length;
  }
}
