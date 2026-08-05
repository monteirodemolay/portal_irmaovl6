import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryRoleRepository, InMemoryUserRepository } from '../../../test/fakes';
import type { Role } from '../entities/role.entity';
import type { User } from '../entities/user.entity';
import { AssignRoleUseCase } from './assign-role.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'role-admin',
  permissions: ['user:manage'],
};

function buildRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'role-1',
    tenantId: 't1',
    nome: 'Secretário',
    chave: 'secretario',
    permissoes: ['member:read'],
    sistemico: true,
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

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    tenantId: 't1',
    email: 'fulano@vl6.org.br',
    memberId: null,
    roleId: 'role-antigo',
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
  const roleRepository = new InMemoryRoleRepository();
  const useCase = new AssignRoleUseCase({
    userRepository,
    roleRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, userRepository, roleRepository };
}

describe('AssignRoleUseCase', () => {
  it('atribui o novo papel e persiste a mudança', async () => {
    const { useCase, userRepository, roleRepository } = buildUseCase();
    await userRepository.create(buildUser());
    await roleRepository.create(buildRole());

    const result = await useCase.execute(ctx, { userId: 'user-1', roleId: 'role-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.roleId).toBe('role-1');
    expect(result.value.updatedAt).toEqual(new Date('2026-06-01T00:00:00Z'));
    expect(result.value.updatedBy).toBe('admin-1');

    const persisted = await userRepository.findById('user-1');
    expect(persisted?.roleId).toBe('role-1');
  });

  it('rejeita quem não tem permissão user:manage', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(
      useCase.execute(ctxSemPermissao, { userId: 'user-1', roleId: 'role-1' }),
    ).rejects.toThrow('Permissão ausente: user:manage.');
  });

  it('retorna not_found quando o usuário não existe', async () => {
    const { useCase, roleRepository } = buildUseCase();
    await roleRepository.create(buildRole());

    const result = await useCase.execute(ctx, { userId: 'user-inexistente', roleId: 'role-1' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('retorna not_found quando o papel não existe', async () => {
    const { useCase, userRepository } = buildUseCase();
    await userRepository.create(buildUser());

    const result = await useCase.execute(ctx, { userId: 'user-1', roleId: 'role-inexistente' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('retorna conflict quando usuário e papel pertencem a Lojas diferentes', async () => {
    const { useCase, userRepository, roleRepository } = buildUseCase();
    await userRepository.create(buildUser({ tenantId: 't2' }));
    await roleRepository.create(buildRole());

    const result = await useCase.execute(ctx, { userId: 'user-1', roleId: 'role-1' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });
});
