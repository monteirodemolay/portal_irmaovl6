import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryNotificationRepository } from '../../../test/fakes';
import type { Notification } from '../entities/notification.entity';
import { DeleteReadNotificationUseCase } from './delete-read-notification.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    tenantId: 't1',
    destinatarioId: 'u1',
    tipo: 'event',
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

describe('DeleteReadNotificationUseCase', () => {
  it('exclui de verdade uma notificação já lida do próprio dono', async () => {
    const notificationRepository = new InMemoryNotificationRepository();
    await notificationRepository.create(buildNotification({ lida: true }));
    const useCase = new DeleteReadNotificationUseCase({ notificationRepository });

    const result = await useCase.execute(ctx, 'n1');

    expect(result.ok).toBe(true);
    expect(await notificationRepository.findById('n1')).toBeNull();
  });

  it('recusa excluir uma notificação ainda não lida', async () => {
    const notificationRepository = new InMemoryNotificationRepository();
    await notificationRepository.create(buildNotification({ lida: false }));
    const useCase = new DeleteReadNotificationUseCase({ notificationRepository });

    const result = await useCase.execute(ctx, 'n1');

    expect(result.ok).toBe(false);
    expect(await notificationRepository.findById('n1')).not.toBeNull();
  });

  it('recusa excluir notificação de outro destinatário', async () => {
    const notificationRepository = new InMemoryNotificationRepository();
    await notificationRepository.create(buildNotification({ lida: true, destinatarioId: 'outro' }));
    const useCase = new DeleteReadNotificationUseCase({ notificationRepository });

    const result = await useCase.execute(ctx, 'n1');

    expect(result.ok).toBe(false);
  });

  it('erro amigável quando a notificação não existe', async () => {
    const notificationRepository = new InMemoryNotificationRepository();
    const useCase = new DeleteReadNotificationUseCase({ notificationRepository });

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result.ok).toBe(false);
  });
});
