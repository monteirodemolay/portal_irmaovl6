import { describe, expect, it } from 'vitest';
import type { IClock } from '../../../shared/ports';
import { InMemoryNotificationRepository } from '../../../test/fakes';
import type { Notification } from '../entities/notification.entity';
import { ArchiveExpiredNotificationsUseCase } from './archive-expired-notifications.use-case';

function buildNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    tenantId: 't1',
    destinatarioId: 'u1',
    tipo: 'announcement',
    titulo: 'Aviso',
    mensagem: 'Mensagem',
    lida: false,
    readAt: null,
    canal: 'interno',
    link: null,
    priority: 'normal',
    important: false,
    archivedAt: null,
    requiresAcknowledgement: false,
    acknowledgedAt: null,
    expiresAt: null,
    actionLabel: null,
    dedupeKey: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'system',
    updatedBy: 'system',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

const clock: IClock = { now: () => new Date('2026-02-01T00:00:00Z') };

describe('ArchiveExpiredNotificationsUseCase', () => {
  it('arquiva só as notificações com expiresAt vencido e ainda não arquivadas', async () => {
    const repo = new InMemoryNotificationRepository();
    await repo.create(
      buildNotification({ id: 'expirada', expiresAt: new Date('2026-01-15T00:00:00Z') }),
    );
    await repo.create(
      buildNotification({ id: 'futura', expiresAt: new Date('2026-03-01T00:00:00Z') }),
    );
    await repo.create(buildNotification({ id: 'sem-expiracao', expiresAt: null }));
    await repo.create(
      buildNotification({
        id: 'ja-arquivada',
        expiresAt: new Date('2026-01-10T00:00:00Z'),
        archivedAt: new Date('2026-01-11T00:00:00Z'),
      }),
    );

    const useCase = new ArchiveExpiredNotificationsUseCase({ notificationRepository: repo, clock });
    const count = await useCase.execute('t1');

    expect(count).toBe(1);
    expect((await repo.findById('expirada'))?.archivedAt).toEqual(new Date('2026-02-01T00:00:00Z'));
    expect((await repo.findById('futura'))?.archivedAt).toBeNull();
    expect((await repo.findById('sem-expiracao'))?.archivedAt).toBeNull();
  });
});
