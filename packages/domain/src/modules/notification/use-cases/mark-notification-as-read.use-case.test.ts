import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import type { Notification } from '../entities/notification.entity';
import type { INotificationRepository } from '../repositories/notification.repository';
import { MarkNotificationAsReadUseCase } from './mark-notification-as-read.use-case';

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
    canal: 'interno',
    link: null,
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

describe('MarkNotificationAsReadUseCase', () => {
  it('rejeita quando a notificação pertence a outro destinatário', async () => {
    const repo = new FakeNotificationRepository(buildNotification({ destinatarioId: 'outro-uid' }));
    const useCase = new MarkNotificationAsReadUseCase({
      notificationRepository: repo as unknown as INotificationRepository,
      clock,
    });

    const result = await useCase.execute(ctx, 'notif-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('forbidden');
    expect(repo.updated).toBeNull();
  });

  it('marca como lida quando o destinatário é o próprio usuário', async () => {
    const repo = new FakeNotificationRepository(buildNotification());
    const useCase = new MarkNotificationAsReadUseCase({
      notificationRepository: repo as unknown as INotificationRepository,
      clock,
    });

    const result = await useCase.execute(ctx, 'notif-1');

    expect(result.ok).toBe(true);
    expect(repo.updated?.lida).toBe(true);
  });
});
