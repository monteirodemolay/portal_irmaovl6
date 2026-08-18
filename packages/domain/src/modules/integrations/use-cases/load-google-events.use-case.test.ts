import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FakeGoogleCalendarService,
  FakeTokenCipher,
  FixedClock,
  InMemoryGoogleCalendarConnectionRepository,
  InMemoryGoogleCalendarEventCacheRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { GoogleCalendarConnection } from '../entities/google-calendar-connection.entity';
import { LoadGoogleEventsUseCase } from './load-google-events.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildConnection(
  overrides: Partial<GoogleCalendarConnection> = {},
): GoogleCalendarConnection {
  return {
    id: 'conn-1',
    tenantId: 't1',
    userId: 'u1',
    syncStatus: 'connected',
    googleAccountEmail: null,
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

function buildUseCase() {
  const connectionRepository = new InMemoryGoogleCalendarConnectionRepository();
  const eventCacheRepository = new InMemoryGoogleCalendarEventCacheRepository();
  const googleCalendarService = new FakeGoogleCalendarService();
  const useCase = new LoadGoogleEventsUseCase({
    connectionRepository,
    eventCacheRepository,
    googleCalendarService,
    tokenCipher: new FakeTokenCipher(),
    clock: new FixedClock(new Date('2026-08-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, connectionRepository, eventCacheRepository, googleCalendarService };
}

describe('LoadGoogleEventsUseCase', () => {
  it('popula o cache local e salva o novo syncToken', async () => {
    const { useCase, connectionRepository, eventCacheRepository, googleCalendarService } =
      buildUseCase();
    await connectionRepository.create(buildConnection());
    googleCalendarService.nextSyncResult = {
      changes: [
        {
          googleEventId: 'g1',
          status: 'confirmed',
          titulo: 'Dentista',
          local: 'Clínica',
          inicio: new Date('2026-08-05T09:00:00Z'),
          fim: new Date('2026-08-05T10:00:00Z'),
        },
      ],
      nextSyncToken: 'token-abc',
      isFullSync: false,
      fullSyncFrom: null,
    };

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    const cached = await eventCacheRepository.listByUser('t1', 'u1');
    expect(cached).toHaveLength(1);
    expect(cached[0]?.titulo).toBe('Dentista');
    const connection = await connectionRepository.findByUserId('t1', 'u1');
    expect(connection?.syncToken).toBe('token-abc');
    expect(connection?.syncStatus).toBe('connected');
  });

  it('remove do cache eventos cancelados', async () => {
    const { useCase, connectionRepository, eventCacheRepository, googleCalendarService } =
      buildUseCase();
    await connectionRepository.create(buildConnection());
    await eventCacheRepository.upsert({
      id: 'u1_g1',
      tenantId: 't1',
      userId: 'u1',
      googleEventId: 'g1',
      titulo: 'Dentista',
      local: null,
      inicio: new Date('2026-08-05T09:00:00Z'),
      fim: new Date('2026-08-05T10:00:00Z'),
      createdAt: new Date('2026-08-01'),
      updatedAt: new Date('2026-08-01'),
      createdBy: 'u1',
      updatedBy: 'u1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });
    googleCalendarService.nextSyncResult = {
      changes: [
        {
          googleEventId: 'g1',
          status: 'cancelled',
          titulo: 'Dentista',
          local: null,
          inicio: new Date('2026-08-05T09:00:00Z'),
          fim: new Date('2026-08-05T10:00:00Z'),
        },
      ],
      nextSyncToken: 'token-def',
      isFullSync: false,
      fullSyncFrom: null,
    };

    await useCase.execute(ctx);

    expect(await eventCacheRepository.listByUser('t1', 'u1')).toHaveLength(0);
  });

  it('reconcilia o cache numa sincronização completa: remove eventos que não vieram mais (ex.: aniversário de contato apagado no Google)', async () => {
    const { useCase, connectionRepository, eventCacheRepository, googleCalendarService } =
      buildUseCase();
    await connectionRepository.create(buildConnection({ syncToken: null }));
    // Cache com 2 eventos futuros: um sobrevive à sincronização completa, o
    // outro (o aniversário apagado no Google) não aparece mais na resposta.
    await eventCacheRepository.upsert({
      id: 'u1_g1',
      tenantId: 't1',
      userId: 'u1',
      googleEventId: 'g1',
      titulo: 'Dentista',
      local: null,
      inicio: new Date('2026-08-05T09:00:00Z'),
      fim: new Date('2026-08-05T10:00:00Z'),
      createdAt: new Date('2026-08-01'),
      updatedAt: new Date('2026-08-01'),
      createdBy: 'u1',
      updatedBy: 'u1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });
    await eventCacheRepository.upsert({
      id: 'u1_g2',
      tenantId: 't1',
      userId: 'u1',
      googleEventId: 'g2',
      titulo: 'Aniversário de Fulano',
      local: null,
      inicio: new Date('2026-08-10T00:00:00Z'),
      fim: new Date('2026-08-11T00:00:00Z'),
      createdAt: new Date('2026-08-01'),
      updatedAt: new Date('2026-08-01'),
      createdBy: 'u1',
      updatedBy: 'u1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });
    googleCalendarService.nextSyncResult = {
      changes: [
        {
          googleEventId: 'g1',
          status: 'confirmed',
          titulo: 'Dentista',
          local: null,
          inicio: new Date('2026-08-05T09:00:00Z'),
          fim: new Date('2026-08-05T10:00:00Z'),
        },
      ],
      nextSyncToken: 'token-full',
      isFullSync: true,
      fullSyncFrom: new Date('2026-08-01T00:00:00Z'),
    };

    await useCase.execute(ctx);

    const cached = await eventCacheRepository.listByUser('t1', 'u1');
    expect(cached.map((event) => event.googleEventId)).toEqual(['g1']);
  });

  it('marca syncStatus como erro quando a chamada ao Google falha', async () => {
    const { useCase, connectionRepository, googleCalendarService } = buildUseCase();
    await connectionRepository.create(buildConnection());
    googleCalendarService.loadEvents = async () => {
      throw new Error('Token expirado');
    };

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(false);
    const connection = await connectionRepository.findByUserId('t1', 'u1');
    expect(connection?.syncStatus).toBe('error');
    expect(connection?.lastError).toBe('Token expirado');
  });

  it('sempre pede uma listagem completa ao Google, mesmo com syncToken salvo (só há sincronização manual, sem cron/webhook)', async () => {
    const { useCase, connectionRepository, googleCalendarService } = buildUseCase();
    await connectionRepository.create(buildConnection({ syncToken: 'token-salvo-anteriormente' }));

    await useCase.execute(ctx);

    expect(googleCalendarService.lastLoadEventsSyncToken).toBeNull();
  });

  it('retorna NotFoundError sem conexão', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
