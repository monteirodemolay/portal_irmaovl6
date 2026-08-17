import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FakeGoogleCalendarService,
  FakeTokenCipher,
  InMemoryGoogleCalendarConnectionRepository,
} from '../../../test/fakes';
import type { GoogleCalendarConnection } from '../entities/google-calendar-connection.entity';
import { DisconnectGoogleCalendarUseCase } from './disconnect-google-calendar.use-case';

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

describe('DisconnectGoogleCalendarUseCase', () => {
  it('revoga o token e remove a conexão', async () => {
    const connectionRepository = new InMemoryGoogleCalendarConnectionRepository();
    await connectionRepository.create(buildConnection());
    const googleCalendarService = new FakeGoogleCalendarService();
    const useCase = new DisconnectGoogleCalendarUseCase({
      connectionRepository,
      googleCalendarService,
      tokenCipher: new FakeTokenCipher(),
    });

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    expect(googleCalendarService.revokedTokens).toEqual(['access-token']);
    expect(await connectionRepository.findByUserId('t1', 'u1')).toBeNull();
  });

  it('é idempotente quando não há conexão', async () => {
    const connectionRepository = new InMemoryGoogleCalendarConnectionRepository();
    const useCase = new DisconnectGoogleCalendarUseCase({
      connectionRepository,
      googleCalendarService: new FakeGoogleCalendarService(),
      tokenCipher: new FakeTokenCipher(),
    });

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
  });
});
