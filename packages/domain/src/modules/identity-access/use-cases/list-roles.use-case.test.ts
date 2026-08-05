import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryRoleRepository } from '../../../test/fakes';
import type { Role } from '../entities/role.entity';
import { ListRolesUseCase } from './list-roles.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'role-admin',
  permissions: ['role:read'],
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
  const roleRepository = new InMemoryRoleRepository();
  const useCase = new ListRolesUseCase({ roleRepository });
  return { useCase, roleRepository };
}

describe('ListRolesUseCase', () => {
  it('lista apenas os papéis da Loja do contexto', async () => {
    const { useCase, roleRepository } = buildUseCase();
    await roleRepository.create(buildRole({ id: 'role-1', tenantId: 't1' }));
    await roleRepository.create(buildRole({ id: 'role-2', tenantId: 't2', chave: 'admin' }));

    const roles = await useCase.execute(ctx);

    expect(roles).toHaveLength(1);
    expect(roles[0]?.id).toBe('role-1');
  });

  it('retorna lista vazia quando o tenant não tem papéis cadastrados', async () => {
    const { useCase } = buildUseCase();

    const roles = await useCase.execute(ctx);

    expect(roles).toEqual([]);
  });

  it('rejeita quem não tem permissão role:read', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(ctxSemPermissao)).rejects.toThrow('Permissão ausente: role:read.');
  });
});
