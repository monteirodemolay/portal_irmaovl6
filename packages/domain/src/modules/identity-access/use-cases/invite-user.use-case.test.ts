import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryRoleRepository, InMemoryUserRepository } from '../../../test/fakes';
import type { Role } from '../entities/role.entity';
import type { User } from '../entities/user.entity';
import { InviteUserUseCase } from './invite-user.use-case';

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
    nome: 'Irmão',
    chave: 'irmao',
    permissoes: ['news:read'],
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

function buildUseCase() {
  const userRepository = new InMemoryUserRepository();
  const roleRepository = new InMemoryRoleRepository();
  const useCase = new InviteUserUseCase({
    userRepository,
    roleRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, userRepository, roleRepository };
}

describe('InviteUserUseCase', () => {
  it('cria a conta do novo usuário vinculada ao papel informado', async () => {
    const { useCase, userRepository, roleRepository } = buildUseCase();
    await roleRepository.create(buildRole());

    const result = await useCase.execute(ctx, {
      uid: 'uid-firebase-2',
      email: 'novo@vl6.org.br',
      roleId: 'role-1',
      memberId: 'member-1',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe('uid-firebase-2');
    expect(result.value.tenantId).toBe('t1');
    expect(result.value.roleId).toBe('role-1');
    expect(result.value.memberId).toBe('member-1');
    expect(result.value.statusConta).toBe('active');

    const persisted = await userRepository.findById('uid-firebase-2');
    expect(persisted).not.toBeNull();
  });

  it('rejeita quem não tem permissão user:manage', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(
      useCase.execute(ctxSemPermissao, {
        uid: 'uid-firebase-2',
        email: 'novo@vl6.org.br',
        roleId: 'role-1',
        memberId: null,
      }),
    ).rejects.toThrow('Permissão ausente: user:manage.');
  });

  it('retorna not_found quando o papel não existe ou é de outro tenant', async () => {
    const { useCase, roleRepository } = buildUseCase();
    await roleRepository.create(buildRole({ tenantId: 't2' }));

    const result = await useCase.execute(ctx, {
      uid: 'uid-firebase-2',
      email: 'novo@vl6.org.br',
      roleId: 'role-1',
      memberId: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('retorna conflict quando já existe conta para o uid informado', async () => {
    const { useCase, userRepository, roleRepository } = buildUseCase();
    await roleRepository.create(buildRole());
    const existing: User = {
      id: 'uid-firebase-2',
      tenantId: 't1',
      email: 'ja-existe@vl6.org.br',
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
    };
    await userRepository.create(existing);

    const result = await useCase.execute(ctx, {
      uid: 'uid-firebase-2',
      email: 'novo@vl6.org.br',
      roleId: 'role-1',
      memberId: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });
});
