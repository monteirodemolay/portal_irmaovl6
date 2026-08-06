import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryRoleRepository,
  InMemoryUserRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { BootstrapPlatformAdminUseCase } from './bootstrap-platform-admin.use-case';

const ctx: AuthContext = {
  uid: 'bootstrap-script',
  tenantId: 'platform',
  roleId: 'bootstrap',
  permissions: ['tenant:manage'],
};

function buildUseCase() {
  const userRepository = new InMemoryUserRepository();
  const roleRepository = new InMemoryRoleRepository();
  const useCase = new BootstrapPlatformAdminUseCase({
    userRepository,
    roleRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, userRepository, roleRepository };
}

describe('BootstrapPlatformAdminUseCase', () => {
  it('cria o papel super_admin sob PLATFORM_TENANT_ID e a primeira conta', async () => {
    const { useCase, userRepository, roleRepository } = buildUseCase();

    const result = await useCase.execute(ctx, { uid: 'uid-firebase-1', email: 'geral@vl6.app' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe('uid-firebase-1');
    expect(result.value.tenantId).toBe('platform');
    expect(result.value.statusConta).toBe('active');

    const role = await roleRepository.findByKey('platform', 'super_admin');
    expect(role).not.toBeNull();
    expect(role?.permissoes).toContain('tenant:manage');
    expect(result.value.roleId).toBe(role?.id);

    const persisted = await userRepository.findById('uid-firebase-1');
    expect(persisted).not.toBeNull();
  });

  it('reaproveita o papel super_admin já existente em vez de duplicar', async () => {
    const { useCase, roleRepository } = buildUseCase();

    await useCase.execute(ctx, { uid: 'uid-firebase-1', email: 'geral@vl6.app' });
    await useCase.execute(ctx, { uid: 'uid-firebase-2', email: 'outro@vl6.app' });

    const roles = await roleRepository.listByTenant('platform');
    expect(roles).toHaveLength(1);
  });

  it('rejeita quem não tem permissão tenant:create', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(
      useCase.execute(ctxSemPermissao, { uid: 'uid-firebase-1', email: 'geral@vl6.app' }),
    ).rejects.toThrow('Permissão ausente: tenant:create.');
  });
});
