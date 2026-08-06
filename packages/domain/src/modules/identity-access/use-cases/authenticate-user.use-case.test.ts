import { describe, expect, it } from 'vitest';
import { FixedClock, InMemoryUserRepository } from '../../../test/fakes';
import type { User } from '../entities/user.entity';
import { AuthenticateUserUseCase } from './authenticate-user.use-case';

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
  const useCase = new AuthenticateUserUseCase({
    userRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, userRepository };
}

describe('AuthenticateUserUseCase', () => {
  it('registra o último login quando a conta está ativa e pertence ao tenant do host', async () => {
    const { useCase, userRepository } = buildUseCase();
    await userRepository.create(buildUser());

    const result = await useCase.execute({ uid: 'user-1', tenantId: 't1' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ultimoLogin).toEqual(new Date('2026-06-01T00:00:00Z'));

    const persisted = await userRepository.findById('user-1');
    expect(persisted?.ultimoLogin).toEqual(new Date('2026-06-01T00:00:00Z'));
  });

  it('retorna not_found quando o usuário não existe', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute({ uid: 'inexistente', tenantId: 't1' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('retorna forbidden quando a conta pertence a outro tenant', async () => {
    const { useCase, userRepository } = buildUseCase();
    await userRepository.create(buildUser({ tenantId: 't2' }));

    const result = await useCase.execute({ uid: 'user-1', tenantId: 't1' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('forbidden');
  });

  it('permite login do Administrador Geral mesmo sem bater com o tenant do host', async () => {
    const { useCase, userRepository } = buildUseCase();
    await userRepository.create(buildUser({ tenantId: 'platform' }));

    const result = await useCase.execute({ uid: 'user-1', tenantId: 't1' });

    expect(result.ok).toBe(true);
  });

  it('retorna conflict quando a conta está bloqueada', async () => {
    const { useCase, userRepository } = buildUseCase();
    await userRepository.create(buildUser({ statusConta: 'blocked' }));

    const result = await useCase.execute({ uid: 'user-1', tenantId: 't1' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });

  it('retorna conflict quando a conta ainda não foi ativada', async () => {
    const { useCase, userRepository } = buildUseCase();
    await userRepository.create(buildUser({ statusConta: 'pending' }));

    const result = await useCase.execute({ uid: 'user-1', tenantId: 't1' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });
});
