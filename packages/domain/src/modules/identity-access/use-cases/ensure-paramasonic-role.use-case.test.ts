import { describe, expect, it } from 'vitest';
import { DEFAULT_ROLE_PERMISSIONS } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryRoleRepository, SequentialIdGenerator } from '../../../test/fakes';
import type { Role } from '../entities/role.entity';
import { EnsureParamasonicRoleUseCase } from './ensure-paramasonic-role.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['role:manage'],
};

function buildDeps() {
  const roleRepository = new InMemoryRoleRepository();
  const useCase = new EnsureParamasonicRoleUseCase({
    roleRepository,
    clock: new FixedClock(new Date('2026-09-16')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, roleRepository };
}

describe('EnsureParamasonicRoleUseCase', () => {
  it('lança ForbiddenError sem a permissão role:manage', async () => {
    const { useCase } = buildDeps();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao)).rejects.toThrow(ForbiddenError);
  });

  it('cria o papel paramaconica quando o tenant ainda não tem', async () => {
    const { useCase, roleRepository } = buildDeps();

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      tenantId: 't1',
      chave: 'paramaconica',
      nome: 'Paramaçônica',
      sistemico: true,
      permissoes: DEFAULT_ROLE_PERMISSIONS.paramaconica,
    });

    const stored = await roleRepository.findByKey('t1', 'paramaconica');
    expect(stored).not.toBeNull();
    expect(stored?.id).toBe(result.value.id);
  });

  it('é idempotente: rodar de novo sincroniza o mesmo papel em vez de duplicar', async () => {
    const { useCase, roleRepository } = buildDeps();

    const first = await useCase.execute(ctx);
    const second = await useCase.execute(ctx);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.value.id).toBe(first.value.id);

    const allRoles = await roleRepository.listByTenant('t1');
    expect(allRoles.filter((r) => r.chave === 'paramaconica')).toHaveLength(1);
  });

  it('sincroniza permissões e nome quando o papel já existe desatualizado', async () => {
    const { useCase, roleRepository } = buildDeps();
    const existing: Role = {
      id: 'role-antigo',
      tenantId: 't1',
      nome: 'Paramaçônica (legado)',
      chave: 'paramaconica',
      permissoes: ['tenant:read'],
      sistemico: false,
      createdAt: new Date('2020-01-01'),
      updatedAt: new Date('2020-01-01'),
      createdBy: 'admin-0',
      updatedBy: 'admin-0',
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await roleRepository.create(existing);

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe('role-antigo');
    expect(result.value.nome).toBe('Paramaçônica');
    expect(result.value.sistemico).toBe(true);
    expect(result.value.permissoes).toEqual(DEFAULT_ROLE_PERMISSIONS.paramaconica);
  });

  it('nunca mexe no papel paramaconica de outro tenant', async () => {
    const { useCase, roleRepository } = buildDeps();
    const outroTenant: Role = {
      id: 'role-outro-tenant',
      tenantId: 't2',
      nome: 'Paramaçônica',
      chave: 'paramaconica',
      permissoes: DEFAULT_ROLE_PERMISSIONS.paramaconica,
      sistemico: true,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'admin-0',
      updatedBy: 'admin-0',
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await roleRepository.create(outroTenant);

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).not.toBe('role-outro-tenant');
    expect(result.value.tenantId).toBe('t1');
  });
});
