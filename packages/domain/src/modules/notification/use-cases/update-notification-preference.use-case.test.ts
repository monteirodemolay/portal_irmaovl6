import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryNotificationPreferenceRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { UpdateNotificationPreferenceUseCase } from './update-notification-preference.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildUseCase() {
  const preferenceRepository = new InMemoryNotificationPreferenceRepository();
  const useCase = new UpdateNotificationPreferenceUseCase({
    preferenceRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, preferenceRepository };
}

describe('UpdateNotificationPreferenceUseCase', () => {
  it('cria a preferência quando o usuário ainda não tinha uma', async () => {
    const { useCase, preferenceRepository } = buildUseCase();

    const result = await useCase.execute(ctx, ['interno', 'email']);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.userId).toBe('u1');
    expect(result.value.canaisHabilitados).toEqual(['interno', 'email']);
    expect(await preferenceRepository.findByUserId('t1', 'u1')).not.toBeNull();
  });

  it('atualiza a preferência existente em vez de duplicar', async () => {
    const { useCase } = buildUseCase();
    await useCase.execute(ctx, ['interno']);

    const result = await useCase.execute(ctx, ['interno', 'whatsapp']);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.canaisHabilitados).toEqual(['interno', 'whatsapp']);
    expect(result.value.id).toBe('id-1');
  });

  it('não altera a preferência de outro usuário', async () => {
    const { useCase, preferenceRepository } = buildUseCase();
    const outroCtx: AuthContext = { ...ctx, uid: 'outro-uid' };
    await useCase.execute(outroCtx, ['interno']);

    await useCase.execute(ctx, ['email']);

    const doOutro = await preferenceRepository.findByUserId('t1', 'outro-uid');
    expect(doOutro?.canaisHabilitados).toEqual(['interno']);
  });
});
