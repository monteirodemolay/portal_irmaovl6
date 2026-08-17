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
import { DeleteOrCancelGoogleEventUseCase } from './delete-or-cancel-google-event.use-case';

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
    sourceType: 'personal',
    sourceId: 'pe-1',
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

describe('DeleteOrCancelGoogleEventUseCase', () => {
  it('cancela o evento no Google e remove o link', async () => {
    const connectionRepository = new InMemoryGoogleCalendarConnectionRepository();
    const syncLinkRepository = new InMemoryGoogleEventSyncLinkRepository();
    await connectionRepository.create(buildConnection());
    await syncLinkRepository.create(buildLink());
    const googleCalendarService = new FakeGoogleCalendarService();
    const useCase = new DeleteOrCancelGoogleEventUseCase({
      connectionRepository,
      syncLinkRepository,
      googleCalendarService,
      tokenCipher: new FakeTokenCipher(),
    });

    const result = await useCase.execute(ctx, 'personal', 'pe-1');

    expect(result.ok).toBe(true);
    expect(googleCalendarService.deletedEventIds).toEqual(['google-event-1']);
    expect(await syncLinkRepository.findBySource('t1', 'u1', 'personal', 'pe-1')).toBeNull();
  });

  it('é idempotente sem link prévio', async () => {
    const connectionRepository = new InMemoryGoogleCalendarConnectionRepository();
    await connectionRepository.create(buildConnection());
    const googleCalendarService = new FakeGoogleCalendarService();
    const useCase = new DeleteOrCancelGoogleEventUseCase({
      connectionRepository,
      syncLinkRepository: new InMemoryGoogleEventSyncLinkRepository(),
      googleCalendarService,
      tokenCipher: new FakeTokenCipher(),
    });

    const result = await useCase.execute(ctx, 'personal', 'pe-nunca-sincronizado');

    expect(result.ok).toBe(true);
    expect(googleCalendarService.deletedEventIds).toHaveLength(0);
  });
});
