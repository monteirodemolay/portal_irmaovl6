import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryRoleRepository, InMemoryUserRepository } from '../../../test/fakes';
import type { Role } from '../entities/role.entity';
import { BootstrapTenantAdminUseCase } from './bootstrap-tenant-admin.use-case';

const ctx: AuthContext = {
  uid: 'platform-owner',
  tenantId: 'platform',
  roleId: 'role-super-admin',
  permissions: ['tenant:manage'],
};

function buildAdminRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'role-admin',
    tenantId: 't1',
    nome: 'Administrador',
    chave: 'admin',
    permissoes: ['user:manage'],
    sistemico: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'system',
    updatedBy: 'system',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const userRepository = new InMemoryUserRepository();
  const roleRepository = new InMemoryRoleRepository();
  const useCase = new BootstrapTenantAdminUseCase({
    userRepository,
    roleRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, userRepository, roleRepository };
}

describe('BootstrapTenantAdminUseCase', () => {
  it('cria a primeira conta do tenant com o papel admin', async () => {
    const { useCase, userRepository, roleRepository } = buildUseCase();
    await roleRepository.create(buildAdminRole());

    const result = await useCase.execute(ctx, {
      uid: 'uid-firebase-1',
      tenantId: 't1',
      email: 'admin@vl6.org.br',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe('uid-firebase-1');
    expect(result.value.roleId).toBe('role-admin');
    expect(result.value.statusConta).toBe('active');

    const persisted = await userRepository.findById('uid-firebase-1');
    expect(persisted).not.toBeNull();
  });

  it('rejeita quem não tem permissão tenant:create', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(
      useCase.execute(ctxSemPermissao, {
        uid: 'uid-firebase-1',
        tenantId: 't1',
        email: 'admin@vl6.org.br',
      }),
    ).rejects.toThrow('Permissão ausente: tenant:create.');
  });

  it('retorna not_found quando o tenant não tem papel admin no seed', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, {
      uid: 'uid-firebase-1',
      tenantId: 't1',
      email: 'admin@vl6.org.br',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
