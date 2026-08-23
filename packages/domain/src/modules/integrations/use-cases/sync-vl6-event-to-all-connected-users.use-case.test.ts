import { describe, expect, it } from 'vitest';
import {
  FakeGoogleCalendarService,
  FakeTokenCipher,
  FixedClock,
  InMemoryGoogleCalendarConnectionRepository,
  InMemoryGoogleEventSyncLinkRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Event } from '../../agenda/entities/event.entity';
import type { GoogleCalendarConnection } from '../entities/google-calendar-connection.entity';
import { SyncVl6EventToAllConnectedUsersUseCase } from './sync-vl6-event-to-all-connected-users.use-case';

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
  const syncLinkRepository = new InMemoryGoogleEventSyncLinkRepository();
  const googleCalendarService = new FakeGoogleCalendarService();
  const useCase = new SyncVl6EventToAllConnectedUsersUseCase({
    connectionRepository,
    syncLinkRepository,
    googleCalendarService,
    tokenCipher: new FakeTokenCipher(),
    clock: new FixedClock(new Date('2026-08-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, connectionRepository, googleCalendarService };
}

describe('SyncVl6EventToAllConnectedUsersUseCase', () => {
  it('sincroniza o evento para todos os Irmãos com a preferência ligada', async () => {
    const { useCase, connectionRepository, googleCalendarService } = buildUseCase();
    await connectionRepository.create(buildConnection({ id: 'conn-1', userId: 'u1' }));
    await connectionRepository.create(buildConnection({ id: 'conn-2', userId: 'u2' }));

    const result = await useCase.execute('t1', event);

    expect(result).toEqual({ succeeded: 2, failedUserIds: [] });
    expect(googleCalendarService.createdEvents).toHaveLength(2);
  });

  it('ignora Irmãos com a preferência desligada', async () => {
    const { useCase, connectionRepository, googleCalendarService } = buildUseCase();
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

    const result = await useCase.execute('t1', event);

    expect(result).toEqual({ succeeded: 1, failedUserIds: [] });
    expect(googleCalendarService.createdEvents).toHaveLength(1);
  });

  it('isola a falha de um Irmão sem afetar os demais', async () => {
    const { useCase, connectionRepository, googleCalendarService } = buildUseCase();
    await connectionRepository.create(
      buildConnection({ id: 'conn-1', userId: 'u1', accessTokenEncrypted: 'enc(token-ok)' }),
    );
    await connectionRepository.create(
      buildConnection({ id: 'conn-2', userId: 'falha', accessTokenEncrypted: 'enc(token-falha)' }),
    );
    const originalCreateEvent = googleCalendarService.createEvent.bind(googleCalendarService);
    googleCalendarService.createEvent = async (accessToken, calendarId, input) => {
      if (accessToken === 'token-falha') throw new Error('falha simulada na API do Google');
      return originalCreateEvent(accessToken, calendarId, input);
    };

    const result = await useCase.execute('t1', event);

    expect(result.succeeded).toBe(1);
    expect(result.failedUserIds).toEqual(['falha']);
    expect(googleCalendarService.createdEvents).toHaveLength(1);
  });

  it('não faz nada quando não há conexões com o sincronismo ligado', async () => {
    const { useCase, googleCalendarService } = buildUseCase();

    const result = await useCase.execute('t1', event);

    expect(result).toEqual({ succeeded: 0, failedUserIds: [] });
    expect(googleCalendarService.createdEvents).toHaveLength(0);
  });
});
