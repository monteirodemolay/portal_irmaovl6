import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryNotificationRepository } from '../../../test/fakes';
import type { Notification } from '../entities/notification.entity';
import { DeleteAllReadNotificationsUseCase } from './delete-all-read-notifications.use-case';

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

describe('DeleteAllReadNotificationsUseCase', () => {
  it('exclui só as lidas do próprio usuário, mantém não lidas e de outros', async () => {
    const notificationRepository = new InMemoryNotificationRepository();
    await notificationRepository.create(buildNotification({ id: 'n1', lida: true }));
    await notificationRepository.create(buildNotification({ id: 'n2', lida: true }));
    await notificationRepository.create(buildNotification({ id: 'n3', lida: false }));
    await notificationRepository.create(
      buildNotification({ id: 'n4', lida: true, destinatarioId: 'outro' }),
    );
    const useCase = new DeleteAllReadNotificationsUseCase({ notificationRepository });

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(2);
    expect(await notificationRepository.findById('n1')).toBeNull();
    expect(await notificationRepository.findById('n2')).toBeNull();
    expect(await notificationRepository.findById('n3')).not.toBeNull();
    expect(await notificationRepository.findById('n4')).not.toBeNull();
  });

  it('retorna 0 quando não há nada lido', async () => {
    const notificationRepository = new InMemoryNotificationRepository();
    await notificationRepository.create(buildNotification({ id: 'n1', lida: false }));
    const useCase = new DeleteAllReadNotificationsUseCase({ notificationRepository });

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(0);
  });
});
