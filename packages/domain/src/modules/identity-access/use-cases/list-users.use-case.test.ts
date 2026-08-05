import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryUserRepository } from '../../../test/fakes';
import type { User } from '../entities/user.entity';
import { ListUsersUseCase } from './list-users.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'role-admin',
  permissions: ['user:read'],
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
  const useCase = new ListUsersUseCase({ userRepository });
  return { useCase, userRepository };
}

describe('ListUsersUseCase', () => {
  it('lista apenas os usuários da Loja do contexto', async () => {
    const { useCase, userRepository } = buildUseCase();
    await userRepository.create(buildUser({ id: 'user-1', tenantId: 't1' }));
    await userRepository.create(buildUser({ id: 'user-2', tenantId: 't2' }));

    const users = await useCase.execute(ctx);

    expect(users).toHaveLength(1);
    expect(users[0]?.id).toBe('user-1');
  });

  it('retorna lista vazia quando o tenant não tem usuários cadastrados', async () => {
    const { useCase } = buildUseCase();

    const users = await useCase.execute(ctx);

    expect(users).toEqual([]);
  });

  it('rejeita quem não tem permissão user:read', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(ctxSemPermissao)).rejects.toThrow('Permissão ausente: user:read.');
  });
});
