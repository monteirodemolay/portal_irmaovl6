import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryGoogleCalendarConnectionRepository } from '../../../test/fakes';
import type { GoogleCalendarConnection } from '../entities/google-calendar-connection.entity';
import { UpdateGoogleCalendarPreferencesUseCase } from './update-google-calendar-preferences.use-case';

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

describe('UpdateGoogleCalendarPreferencesUseCase', () => {
  it('atualiza as preferências e o calendário de destino', async () => {
    const connectionRepository = new InMemoryGoogleCalendarConnectionRepository();
    await connectionRepository.create(buildConnection());
    const useCase = new UpdateGoogleCalendarPreferencesUseCase({
      connectionRepository,
      clock: new FixedClock(new Date('2026-08-01T00:00:00Z')),
    });

    const result = await useCase.execute(ctx, {
      preferences: {
        exibirEventosGoogle: false,
        sincronizarVL6ParaGoogle: false,
        sincronizarPessoalParaGoogle: true,
        detectarConflitos: true,
      },
      calendarId: 'loja-vl6@group.calendar.google.com',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.preferences.exibirEventosGoogle).toBe(false);
    expect(result.value.calendarId).toBe('loja-vl6@group.calendar.google.com');
  });

  it('retorna NotFoundError sem conexão', async () => {
    const useCase = new UpdateGoogleCalendarPreferencesUseCase({
      connectionRepository: new InMemoryGoogleCalendarConnectionRepository(),
      clock: new FixedClock(),
    });

    const result = await useCase.execute(ctx, {
      preferences: {
        exibirEventosGoogle: true,
        sincronizarVL6ParaGoogle: true,
        sincronizarPessoalParaGoogle: true,
        detectarConflitos: true,
      },
      calendarId: 'primary',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
