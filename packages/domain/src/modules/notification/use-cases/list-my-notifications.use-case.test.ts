import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryNotificationRepository } from '../../../test/fakes';
import type { Notification } from '../entities/notification.entity';
import { ListMyNotificationsUseCase } from './list-my-notifications.use-case';

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

describe('ListMyNotificationsUseCase', () => {
  it('não exige permissão de RBAC — o critério é ser o destinatário', async () => {
    const repo = new InMemoryNotificationRepository();
    const useCase = new ListMyNotificationsUseCase({ notificationRepository: repo });

    const result = await useCase.execute(ctx, { limit: 20 });

    expect(result.items).toEqual([]);
  });

  it('retorna apenas as notificações do próprio destinatário', async () => {
    const repo = new InMemoryNotificationRepository();
    await repo.create(buildNotification());
    await repo.create(buildNotification({ id: 'notif-2', destinatarioId: 'outro-uid' }));
    const useCase = new ListMyNotificationsUseCase({ notificationRepository: repo });

    const result = await useCase.execute(ctx, { limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('notif-1');
  });

  it('respeita o limite de paginação informado', async () => {
    const repo = new InMemoryNotificationRepository();
    await repo.create(buildNotification({ id: 'notif-1' }));
    await repo.create(buildNotification({ id: 'notif-2' }));
    await repo.create(buildNotification({ id: 'notif-3' }));
    const useCase = new ListMyNotificationsUseCase({ notificationRepository: repo });

    const result = await useCase.execute(ctx, { limit: 2 });

    expect(result.items).toHaveLength(2);
  });
});
