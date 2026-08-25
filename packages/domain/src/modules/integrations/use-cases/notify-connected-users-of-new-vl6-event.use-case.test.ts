import { describe, expect, it } from 'vitest';
import {
  FixedClock,
  InMemoryGoogleCalendarConnectionRepository,
  InMemoryNotificationPreferenceRepository,
  InMemoryNotificationRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { INotificationGateway } from '../../notification/services/notification-gateway';
import type { Notification } from '../../notification/entities/notification.entity';
import type { Event } from '../../agenda/entities/event.entity';
import type { GoogleCalendarConnection } from '../entities/google-calendar-connection.entity';
import { NotifyConnectedUsersOfNewVl6EventUseCase } from './notify-connected-users-of-new-vl6-event.use-case';

class FakeNotificationGateway implements INotificationGateway {
  sent: Notification[] = [];
  async send(notification: Notification) {
    this.sent.push(notification);
  }
}

function buildConnection(overrides: Partial<GoogleCalendarConnection>): GoogleCalendarConnection {
  return {
    id: overrides.id ?? 'conn-1',
    tenantId: 't1',
    userId: overrides.userId ?? 'u1',
    syncStatus: 'connected',
    googleAccountEmail: 'irmao@gmail.com',
    accessTokenEncrypted: 'enc(access-token)',
    accessTokenExpiresAt: new Date('2026-06-01T01:00:00Z'),
    refreshTokenEncrypted: 'enc(refresh-token)',
    scope: 'https://www.googleapis.com/auth/calendar.events',
    syncToken: null,
    calendarId: 'primary',
    lastSyncedAt: null,
    lastError: null,
    preferences: {
      exibirEventosGoogle: true,
      sincronizarVL6ParaGoogle: true,
      sincronizarPessoalParaGoogle: true,
      detectarConflitos: true,
    },
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

const event: Event = {
  id: 'event-1',
  tenantId: 't1',
  tipo: 'sessao',
  titulo: 'Sessão Ordinária',
  descricao: null,
  local: 'Sede da Loja',
  dataInicio: new Date('2026-08-18T20:00:00Z'),
  dataFim: new Date('2026-08-18T22:00:00Z'),
  exigeConfirmacaoPresenca: false,
  capacidadeMaxima: null,
  traje: null,
  chegadaSugerida: null,
  observacoes: null,
  arquivosRelacionados: [],
  boardTermId: null,
  nivelAcesso: 'irmaos',
  exibirNaLinhaDoTempo: true,
  grau: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

function buildUseCase() {
  const connectionRepository = new InMemoryGoogleCalendarConnectionRepository();
  const notificationRepository = new InMemoryNotificationRepository();
  const notificationPreferenceRepository = new InMemoryNotificationPreferenceRepository();
  const notificationGateway = new FakeNotificationGateway();
  const useCase = new NotifyConnectedUsersOfNewVl6EventUseCase({
    connectionRepository,
    notificationRepository,
    notificationPreferenceRepository,
    notificationGateway,
    clock: new FixedClock(new Date('2026-08-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, connectionRepository, notificationRepository };
}

describe('NotifyConnectedUsersOfNewVl6EventUseCase', () => {
  it('notifica cada Irmão com a Agenda da Loja sincronizada ao Google', async () => {
    const { useCase, connectionRepository, notificationRepository } = buildUseCase();
    await connectionRepository.create(buildConnection({ id: 'conn-1', userId: 'u1' }));
    await connectionRepository.create(buildConnection({ id: 'conn-2', userId: 'u2' }));

    await useCase.execute('t1', event);

    const notifiedU1 = await notificationRepository.listByRecipient('t1', 'u1', { limit: 10 });
    const notifiedU2 = await notificationRepository.listByRecipient('t1', 'u2', { limit: 10 });
    expect(notifiedU1.items).toHaveLength(1);
    expect(notifiedU1.items[0]?.tipo).toBe('event');
    expect(notifiedU1.items[0]?.titulo).toBe('Novo evento na Agenda da Loja');
    expect(notifiedU2.items).toHaveLength(1);
  });

  it('não notifica Irmãos com a sincronização desligada', async () => {
    const { useCase, connectionRepository, notificationRepository } = buildUseCase();
    await connectionRepository.create(buildConnection({ id: 'conn-1', userId: 'u1' }));
    await connectionRepository.create(
      buildConnection({
        id: 'conn-2',
        userId: 'u2',
        preferences: {
          exibirEventosGoogle: true,
          sincronizarVL6ParaGoogle: false,
          sincronizarPessoalParaGoogle: true,
          detectarConflitos: true,
        },
      }),
    );

    await useCase.execute('t1', event);

    const notifiedU1 = await notificationRepository.listByRecipient('t1', 'u1', { limit: 10 });
    const notifiedU2 = await notificationRepository.listByRecipient('t1', 'u2', { limit: 10 });
    expect(notifiedU1.items).toHaveLength(1);
    expect(notifiedU2.items).toHaveLength(0);
  });

  it('não faz nada quando não há conexões com o sincronismo ligado', async () => {
    const { useCase, notificationRepository } = buildUseCase();

    await useCase.execute('t1', event);

    const notified = await notificationRepository.listByRecipient('t1', 'u1', { limit: 10 });
    expect(notified.items).toHaveLength(0);
  });
});
