import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import type { Notification } from '../entities/notification.entity';
import type { INotificationRepository } from '../repositories/notification.repository';
import { ToggleNotificationImportantUseCase } from './toggle-notification-important.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

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

class FakeNotificationRepository implements Partial<INotificationRepository> {
  constructor(private readonly notification: Notification | null) {}
  updated: Notification | null = null;
  async findById() {
    return this.notification;
  }
  async update(notification: Notification) {
    this.updated = notification;
  }
}

const clock: IClock = { now: () => new Date('2026-01-02T00:00:00Z') };

describe('ToggleNotificationImportantUseCase', () => {
  it('rejeita quando a notificação pertence a outro destinatário', async () => {
    const repo = new FakeNotificationRepository(buildNotification({ destinatarioId: 'outro-uid' }));
    const useCase = new ToggleNotificationImportantUseCase({
      notificationRepository: repo as unknown as INotificationRepository,
      clock,
    });

    const result = await useCase.execute(ctx, 'notif-1');

    expect(result.ok).toBe(false);
  });

  it('alterna important de false para true e de volta', async () => {
    const notification = buildNotification();
    const repo = new FakeNotificationRepository(notification);
    const useCase = new ToggleNotificationImportantUseCase({
      notificationRepository: repo as unknown as INotificationRepository,
      clock,
    });

    const first = await useCase.execute(ctx, 'notif-1');
    expect(first.ok).toBe(true);
    expect(repo.updated?.important).toBe(true);
  });
});
