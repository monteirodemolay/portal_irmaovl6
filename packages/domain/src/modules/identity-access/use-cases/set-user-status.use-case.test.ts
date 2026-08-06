import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryUserRepository } from '../../../test/fakes';
import type { User } from '../entities/user.entity';
import { SetUserStatusUseCase } from './set-user-status.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'role-admin',
  permissions: ['user:manage'],
};

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    tenantId: 't1',
    email: 'fulano@vl6.org.br',
    memberId: null,
    roleId: 'role-1',
    mfaHabilitado: false,
    ultimoLogin: null,
    statusConta: 'active',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const userRepository = new InMemoryUserRepository();
  const useCase = new SetUserStatusUseCase({
    userRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, userRepository };
}

describe('SetUserStatusUseCase', () => {
  it('bloqueia a conta e persiste a mudança', async () => {
    const { useCase, userRepository } = buildUseCase();
    await userRepository.create(buildUser());

    const result = await useCase.execute(ctx, { userId: 'user-1', statusConta: 'blocked' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.statusConta).toBe('blocked');
    expect(result.value.updatedAt).toEqual(new Date('2026-06-01T00:00:00Z'));

    const persisted = await userRepository.findById('user-1');
    expect(persisted?.statusConta).toBe('blocked');
  });

  it('reativa uma conta bloqueada', async () => {
    const { useCase, userRepository } = buildUseCase();
    await userRepository.create(buildUser({ statusConta: 'blocked' }));

    const result = await useCase.execute(ctx, { userId: 'user-1', statusConta: 'active' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.statusConta).toBe('active');
  });

  it('rejeita quem não tem permissão user:manage', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(
      useCase.execute(ctxSemPermissao, { userId: 'user-1', statusConta: 'blocked' }),
    ).rejects.toThrow('Permissão ausente: user:manage.');
  });

  it('retorna not_found quando o usuário não existe', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, {
      userId: 'user-inexistente',
      statusConta: 'blocked',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('retorna conflict quando o usuário pertence a outra Loja', async () => {
    const { useCase, userRepository } = buildUseCase();
    await userRepository.create(buildUser({ tenantId: 't2' }));

    const result = await useCase.execute(ctx, { userId: 'user-1', statusConta: 'blocked' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });

  it('impede que o próprio usuário se bloqueie', async () => {
    const { useCase, userRepository } = buildUseCase();
    await userRepository.create(buildUser({ id: 'admin-1' }));

    const result = await useCase.execute(ctx, { userId: 'admin-1', statusConta: 'blocked' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
  });
});
