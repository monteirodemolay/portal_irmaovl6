import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryRoleRepository } from '../../../test/fakes';
import type { Role } from '../entities/role.entity';
import { SyncSystemRolePermissionsUseCase } from './sync-system-role-permissions.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'role-admin',
  permissions: ['role:manage'],
};

function buildRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'role-membro',
    tenantId: 't1',
    nome: 'Irmão',
    chave: 'membro',
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

function buildUseCase() {
  const roleRepository = new InMemoryRoleRepository();
  const useCase = new SyncSystemRolePermissionsUseCase({
    roleRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, roleRepository };
}

describe('SyncSystemRolePermissionsUseCase', () => {
  it('reaplica o seed de permissões a um papel sistêmico desatualizado', async () => {
    const { useCase, roleRepository } = buildUseCase();
    await roleRepository.create(buildRole());

    const result = await useCase.execute(ctx, 'role-membro');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.permissoes).toContain('memberCentral:update');
    expect(result.value.permissoes).toContain('memberDirectory:read');
    expect(result.value.updatedAt).toEqual(new Date('2026-06-01T00:00:00Z'));

    const persisted = await roleRepository.findById('role-membro');
    expect(persisted?.permissoes).toEqual(result.value.permissoes);
  });

  it('rejeita quem não tem permissão role:manage', async () => {
    const { useCase, roleRepository } = buildUseCase();
    await roleRepository.create(buildRole());
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(ctxSemPermissao, 'role-membro')).rejects.toThrow(
      'Permissão ausente: role:manage.',
    );
  });

  it('retorna not_found quando o papel não existe ou é de outro tenant', async () => {
    const { useCase, roleRepository } = buildUseCase();
    await roleRepository.create(buildRole({ tenantId: 't2' }));

    const result = await useCase.execute(ctx, 'role-membro');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('rejeita papel não sistêmico', async () => {
    const { useCase, roleRepository } = buildUseCase();
    await roleRepository.create(buildRole({ id: 'role-custom', sistemico: false }));

    const result = await useCase.execute(ctx, 'role-custom');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });
});
