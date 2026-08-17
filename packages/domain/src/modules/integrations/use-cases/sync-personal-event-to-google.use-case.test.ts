import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FakeGoogleCalendarService,
  FakeTokenCipher,
  FixedClock,
  InMemoryGoogleCalendarConnectionRepository,
  InMemoryGoogleEventSyncLinkRepository,
  InMemoryPersonalEventRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { PersonalEvent } from '../../agenda/entities/personal-event.entity';
import type { GoogleCalendarConnection } from '../entities/google-calendar-connection.entity';
import { SyncPersonalEventToGoogleUseCase } from './sync-personal-event-to-google.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildConnection(
  overrides: Partial<GoogleCalendarConnection> = {},
): GoogleCalendarConnection {
  return {
    id: 'conn-1',
    tenantId: 't1',
    userId: 'u1',
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

function buildPersonalEvent(overrides: Partial<PersonalEvent> = {}): PersonalEvent {
  return {
    id: 'personal-1',
    tenantId: 't1',
    userId: 'u1',
    titulo: 'Dentista',
    descricao: 'Consulta de rotina',
    local: 'Clínica Odontológica Sorriso',
    dataInicio: new Date('2026-08-19T19:05:00Z'),
    dataFim: new Date('2026-08-19T20:05:00Z'),
    lembreteMinutosAntes: 30,
    sincronizarComGoogle: true,
    googleEventId: null,
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

function buildUseCase() {
  const connectionRepository = new InMemoryGoogleCalendarConnectionRepository();
  const syncLinkRepository = new InMemoryGoogleEventSyncLinkRepository();
  const personalEventRepository = new InMemoryPersonalEventRepository();
  const googleCalendarService = new FakeGoogleCalendarService();
  const useCase = new SyncPersonalEventToGoogleUseCase({
    connectionRepository,
    syncLinkRepository,
    personalEventRepository,
    googleCalendarService,
    tokenCipher: new FakeTokenCipher(),
    clock: new FixedClock(new Date('2026-08-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return {
    useCase,
    connectionRepository,
    syncLinkRepository,
    personalEventRepository,
    googleCalendarService,
  };
}

describe('SyncPersonalEventToGoogleUseCase', () => {
  it('cria o evento no Google, grava o link e atualiza o googleEventId no compromisso', async () => {
    const {
      useCase,
      connectionRepository,
      personalEventRepository,
      syncLinkRepository,
      googleCalendarService,
    } = buildUseCase();
    await connectionRepository.create(buildConnection());
    await personalEventRepository.create(buildPersonalEvent());

    const result = await useCase.execute(ctx, 'personal-1');

    expect(result.ok).toBe(true);
    expect(googleCalendarService.createdEvents).toHaveLength(1);
    const updated = await personalEventRepository.findById('personal-1');
    expect(updated?.googleEventId).toBe('google-event-1');
    const link = await syncLinkRepository.findBySource('t1', 'u1', 'personal', 'personal-1');
    expect(link?.googleEventId).toBe('google-event-1');
  });

  it('atualiza o evento existente no Google em vez de duplicar', async () => {
    const { useCase, connectionRepository, personalEventRepository, googleCalendarService } =
      buildUseCase();
    await connectionRepository.create(buildConnection());
    await personalEventRepository.create(buildPersonalEvent({ googleEventId: 'google-event-9' }));

    const result = await useCase.execute(ctx, 'personal-1');

    expect(result.ok).toBe(true);
    expect(googleCalendarService.createdEvents).toHaveLength(0);
    expect(googleCalendarService.updatedEvents).toHaveLength(1);
    expect(googleCalendarService.updatedEvents[0]?.googleEventId).toBe('google-event-9');
  });

  it('não sincroniza compromisso de outro usuário', async () => {
    const { useCase, connectionRepository, personalEventRepository, googleCalendarService } =
      buildUseCase();
    await connectionRepository.create(buildConnection());
    await personalEventRepository.create(buildPersonalEvent({ userId: 'outro-usuario' }));

    const result = await useCase.execute(ctx, 'personal-1');

    expect(result.ok).toBe(false);
    expect(googleCalendarService.createdEvents).toHaveLength(0);
  });

  it('não sincroniza quando sincronizarComGoogle está desligado no compromisso', async () => {
    const { useCase, connectionRepository, personalEventRepository, googleCalendarService } =
      buildUseCase();
    await connectionRepository.create(buildConnection());
    await personalEventRepository.create(buildPersonalEvent({ sincronizarComGoogle: false }));

    const result = await useCase.execute(ctx, 'personal-1');

    expect(result.ok).toBe(true);
    expect(googleCalendarService.createdEvents).toHaveLength(0);
  });

  it('não sincroniza quando a preferência sincronizarPessoalParaGoogle está desligada', async () => {
    const { useCase, connectionRepository, personalEventRepository, googleCalendarService } =
      buildUseCase();
    await connectionRepository.create(
      buildConnection({
        preferences: {
          exibirEventosGoogle: true,
          sincronizarVL6ParaGoogle: true,
          sincronizarPessoalParaGoogle: false,
          detectarConflitos: true,
        },
      }),
    );
    await personalEventRepository.create(buildPersonalEvent());

    const result = await useCase.execute(ctx, 'personal-1');

    expect(result.ok).toBe(true);
    expect(googleCalendarService.createdEvents).toHaveLength(0);
  });

  it('não sincroniza sem conexão ativa', async () => {
    const { useCase, personalEventRepository, googleCalendarService } = buildUseCase();
    await personalEventRepository.create(buildPersonalEvent());

    const result = await useCase.execute(ctx, 'personal-1');

    expect(result.ok).toBe(true);
    expect(googleCalendarService.createdEvents).toHaveLength(0);
  });
});
