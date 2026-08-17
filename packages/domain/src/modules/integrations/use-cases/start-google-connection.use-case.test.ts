import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FakeGoogleCalendarService, FakeOAuthStateSigner, FixedClock } from '../../../test/fakes';
import { StartGoogleConnectionUseCase } from './start-google-connection.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildUseCase() {
  const googleCalendarService = new FakeGoogleCalendarService();
  const stateSigner = new FakeOAuthStateSigner();
  const useCase = new StartGoogleConnectionUseCase({
    googleCalendarService,
    stateSigner,
    clock: new FixedClock(new Date('2026-08-01T00:00:00Z')),
  });
  return { useCase, googleCalendarService, stateSigner };
}

describe('StartGoogleConnectionUseCase', () => {
  it('assina o state com uid/tenantId/timestamp e monta a URL de autorização', () => {
    const { useCase, stateSigner } = buildUseCase();

    const url = useCase.execute(ctx);

    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth?state=');
    const state = new URL(url).searchParams.get('state');
    expect(state).not.toBeNull();
    const payload = stateSigner.verify(state!);
    expect(payload).toEqual({ uid: 'u1', tenantId: 't1', issuedAt: 1785542400000 });
  });

  it('não grava nada — apenas gera a URL', () => {
    const { useCase, googleCalendarService } = buildUseCase();

    useCase.execute(ctx);

    expect(googleCalendarService.createdEvents).toHaveLength(0);
  });
});
