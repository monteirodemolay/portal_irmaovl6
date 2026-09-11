import { describe, expect, it } from 'vitest';
import { FixedClock, InMemoryNotificationRepository } from '../../../test/fakes';
import type { Notification } from '../entities/notification.entity';
import { PurgeExpiredNotificationsUseCase } from './purge-expired-notifications.use-case';

function buildNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    tenantId: 't1',
    destinatarioId: 'u1',
    tipo: 'event',
    titulo: 'Aviso',
    mensagem: 'Mensagem',
    lida: true,
    readAt: new Date('2026-01-01'),
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

describe('PurgeExpiredNotificationsUseCase', () => {
  it('apaga de verdade quem foi arquivado há mais da folga de retenção', async () => {
    const notificationRepository = new InMemoryNotificationRepository();
    // arquivada há 10 dias — passou da folga de 7
    await notificationRepository.create(
      buildNotification({ id: 'antiga', archivedAt: new Date('2026-01-01T00:00:00Z') }),
    );
    // arquivada há 2 dias — ainda dentro da folga
    await notificationRepository.create(
      buildNotification({ id: 'recente', archivedAt: new Date('2026-01-09T00:00:00Z') }),
    );
    // nunca arquivada — nem entra na consulta
    await notificationRepository.create(buildNotification({ id: 'ativa', archivedAt: null }));

    const useCase = new PurgeExpiredNotificationsUseCase({
      notificationRepository,
      clock: new FixedClock(new Date('2026-01-11T00:00:00Z')),
    });

    const purged = await useCase.execute('t1');

    expect(purged).toBe(1);
    expect(await notificationRepository.findById('antiga')).toBeNull();
    expect(await notificationRepository.findById('recente')).not.toBeNull();
    expect(await notificationRepository.findById('ativa')).not.toBeNull();
  });
});
