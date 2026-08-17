import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FakeGoogleCalendarService,
  FakeOAuthStateSigner,
  FakeTokenCipher,
  FixedClock,
  InMemoryGoogleCalendarConnectionRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CompleteGoogleConnectionUseCase } from './complete-google-connection.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildUseCase() {
  const connectionRepository = new InMemoryGoogleCalendarConnectionRepository();
  const googleCalendarService = new FakeGoogleCalendarService();
  const stateSigner = new FakeOAuthStateSigner();
  const tokenCipher = new FakeTokenCipher();
  const clock = new FixedClock(new Date('2026-01-01T00:00:00Z'));
  const useCase = new CompleteGoogleConnectionUseCase({
    connectionRepository,
    googleCalendarService,
    tokenCipher,
    stateSigner,
    clock,
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, connectionRepository, googleCalendarService, stateSigner };
}

describe('CompleteGoogleConnectionUseCase', () => {
  it('cria a conexão com tokens cifrados e preferências padrão ligadas', async () => {
    const { useCase, connectionRepository, stateSigner } = buildUseCase();
    const state = stateSigner.sign({ uid: 'u1', tenantId: 't1', issuedAt: Date.now() });

    const result = await useCase.execute(ctx, 'auth-code', state);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.syncStatus).toBe('connected');
    expect(result.value.accessTokenEncrypted).toBe('enc(access-token)');
    expect(result.value.preferences.sincronizarVL6ParaGoogle).toBe(true);

    const stored = await connectionRepository.findByUserId('t1', 'u1');
    expect(stored).not.toBeNull();
  });

  it('atualiza a conexão existente em vez de duplicar', async () => {
    const { useCase, connectionRepository, stateSigner } = buildUseCase();
    const state = stateSigner.sign({ uid: 'u1', tenantId: 't1', issuedAt: Date.now() });
    await useCase.execute(ctx, 'auth-code', state);

    const result = await useCase.execute(ctx, 'auth-code-2', state);

    expect(result.ok).toBe(true);
    const all = await connectionRepository.findByUserId('t1', 'u1');
    expect(all?.id).toBe(result.ok ? result.value.id : undefined);
  });

  it('rejeita state inválido (uid diferente)', async () => {
    const { useCase, stateSigner } = buildUseCase();
    const state = stateSigner.sign({ uid: 'outro-uid', tenantId: 't1', issuedAt: Date.now() });

    const result = await useCase.execute(ctx, 'auth-code', state);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
  });

  it('rejeita state corrompido', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'auth-code', 'not-a-valid-state');

    expect(result.ok).toBe(false);
  });
});
