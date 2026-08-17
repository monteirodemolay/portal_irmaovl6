import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FakeGoogleCalendarService,
  FakeTokenCipher,
  InMemoryGoogleCalendarConnectionRepository,
  InMemoryGoogleEventSyncLinkRepository,
} from '../../../test/fakes';
import type { GoogleCalendarConnection } from '../entities/google-calendar-connection.entity';
import type { GoogleEventSyncLink } from '../entities/google-event-sync-link.entity';
import { UpdateGoogleEventUseCase } from './update-google-event.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildConnection(): GoogleCalendarConnection {
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
  };
}

function buildLink(): GoogleEventSyncLink {
  return {
    id: 'link-1',
    tenantId: 't1',
    userId: 'u1',
    sourceType: 'vl6',
    sourceId: 'event-1',
    googleEventId: 'google-event-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'u1',
    updatedBy: 'u1',
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
}

const input = {
  titulo: 'Sessão Ordinária — remarcada',
  descricao: null,
  local: 'Sede da Loja',
  inicio: new Date('2026-08-18T20:00:00Z'),
  fim: new Date('2026-08-18T22:00:00Z'),
};

describe('UpdateGoogleEventUseCase', () => {
  it('reenvia a atualização para o evento já espelhado', async () => {
    const connectionRepository = new InMemoryGoogleCalendarConnectionRepository();
    const syncLinkRepository = new InMemoryGoogleEventSyncLinkRepository();
    await connectionRepository.create(buildConnection());
    await syncLinkRepository.create(buildLink());
    const googleCalendarService = new FakeGoogleCalendarService();
    const useCase = new UpdateGoogleEventUseCase({
      connectionRepository,
      syncLinkRepository,
      googleCalendarService,
      tokenCipher: new FakeTokenCipher(),
    });

    const result = await useCase.execute(ctx, 'vl6', 'event-1', input);

    expect(result.ok).toBe(true);
    expect(googleCalendarService.updatedEvents).toEqual([
      { googleEventId: 'google-event-1', input },
    ]);
  });

  it('retorna NotFoundError sem link prévio', async () => {
    const connectionRepository = new InMemoryGoogleCalendarConnectionRepository();
    await connectionRepository.create(buildConnection());
    const useCase = new UpdateGoogleEventUseCase({
      connectionRepository,
      syncLinkRepository: new InMemoryGoogleEventSyncLinkRepository(),
      googleCalendarService: new FakeGoogleCalendarService(),
      tokenCipher: new FakeTokenCipher(),
    });

    const result = await useCase.execute(ctx, 'vl6', 'event-nunca-sincronizado', input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
