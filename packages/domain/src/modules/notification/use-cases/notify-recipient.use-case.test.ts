import { describe, expect, it } from 'vitest';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { NotificationPreference } from '../entities/notification-preference.entity';
import type { Notification } from '../entities/notification.entity';
import type { INotificationPreferenceRepository } from '../repositories/notification-preference.repository';
import type { INotificationRepository } from '../repositories/notification.repository';
import type { INotificationGateway } from '../services/notification-gateway';
import { NotifyRecipientUseCase } from './notify-recipient.use-case';

class FakeNotificationRepository implements Partial<INotificationRepository> {
  created: Notification | null = null;
  byDedupeKey = new Map<string, Notification>();
  async create(notification: Notification) {
    this.created = notification;
    if (notification.dedupeKey) this.byDedupeKey.set(notification.dedupeKey, notification);
  }
  async findByDedupeKey(_tenantId: string, dedupeKey: string) {
    return this.byDedupeKey.get(dedupeKey) ?? null;
  }
}

class FakePreferenceRepository implements Partial<INotificationPreferenceRepository> {
  constructor(private readonly preference: NotificationPreference | null) {}
  async findByUserId() {
    return this.preference;
  }
}

class FakeNotificationGateway implements INotificationGateway {
  sent: Notification[] = [];
  async send(notification: Notification) {
    this.sent.push(notification);
  }
}

const clock: IClock = { now: () => new Date('2026-01-01T00:00:00Z') };
const idGenerator: IIdGenerator = { next: () => 'notif-1' };

function buildPreference(overrides: Partial<NotificationPreference> = {}): NotificationPreference {
  return {
    id: 'pref-1',
    tenantId: 't1',
    userId: 'u1',
    canaisHabilitados: ['interno'],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'u1',
    updatedBy: 'u1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('NotifyRecipientUseCase', () => {
  it('sempre persiste a notificação interna, mesmo sem preferências cadastradas', async () => {
    const notificationRepository = new FakeNotificationRepository();
    const gateway = new FakeNotificationGateway();
    const useCase = new NotifyRecipientUseCase({
      notificationRepository: notificationRepository as unknown as INotificationRepository,
      notificationPreferenceRepository: new FakePreferenceRepository(
        null,
      ) as unknown as INotificationPreferenceRepository,
      notificationGateway: gateway,
      clock,
      idGenerator,
    });

    await useCase.execute({
      tenantId: 't1',
      destinatarioId: 'u1',
      tipo: 'announcement',
      titulo: 'Aviso importante',
      mensagem: 'Reunião extraordinária amanhã.',
      link: '/avisos',
    });

    expect(notificationRepository.created?.canal).toBe('interno');
    expect(gateway.sent).toHaveLength(0);
  });

  it('despacha canais externos habilitados via gateway, além do interno', async () => {
    const notificationRepository = new FakeNotificationRepository();
    const gateway = new FakeNotificationGateway();
    const useCase = new NotifyRecipientUseCase({
      notificationRepository: notificationRepository as unknown as INotificationRepository,
      notificationPreferenceRepository: new FakePreferenceRepository(
        buildPreference({ canaisHabilitados: ['interno', 'email', 'whatsapp'] }),
      ) as unknown as INotificationPreferenceRepository,
      notificationGateway: gateway,
      clock,
      idGenerator,
    });

    await useCase.execute({
      tenantId: 't1',
      destinatarioId: 'u1',
      tipo: 'event',
      titulo: 'Novo evento',
      mensagem: 'Sessão marcada.',
      link: '/agenda',
    });

    expect(notificationRepository.created?.canal).toBe('interno');
    expect(gateway.sent.map((n) => n.canal).sort()).toEqual(['email', 'whatsapp']);
  });

  it('não duplica nem redespacha quando o dedupeKey já existe', async () => {
    const notificationRepository = new FakeNotificationRepository();
    const gateway = new FakeNotificationGateway();
    const useCase = new NotifyRecipientUseCase({
      notificationRepository: notificationRepository as unknown as INotificationRepository,
      notificationPreferenceRepository: new FakePreferenceRepository(
        buildPreference({ canaisHabilitados: ['interno', 'email'] }),
      ) as unknown as INotificationPreferenceRepository,
      notificationGateway: gateway,
      clock,
      idGenerator,
    });

    const input = {
      tenantId: 't1',
      destinatarioId: 'u1',
      tipo: 'event' as const,
      titulo: 'Lembrete de sessão',
      mensagem: 'Sua sessão é hoje.',
      link: '/agenda',
      dedupeKey: 'event:e1:day-of:2026-01-01:user:u1',
    };

    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    expect(second.id).toBe(first.id);
    expect(gateway.sent).toHaveLength(1);
  });
});
