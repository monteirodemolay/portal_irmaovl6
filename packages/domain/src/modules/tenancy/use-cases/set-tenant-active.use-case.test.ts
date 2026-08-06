import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryTenantRepository } from '../../../test/fakes';
import type { Tenant } from '../entities/tenant.entity';
import { SetTenantActiveUseCase } from './set-tenant-active.use-case';

function buildTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 't1',
    tenantId: 't1',
    nome: 'Loja Teste',
    numero: '1',
    potencia: 'GLEG',
    dominio: null,
    subdominio: 'teste',
    endereco: null,
    telefone: null,
    whatsapp: null,
    site: null,
    email: 'contato@teste.org',
    modulosHabilitados: [],
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

const platformCtx: AuthContext = {
  uid: 'geral',
  tenantId: 'platform',
  roleId: 'super_admin',
  permissions: [],
};

describe('SetTenantActiveUseCase', () => {
  it('suspende um tenant', async () => {
    const tenantRepository = new InMemoryTenantRepository();
    await tenantRepository.create(buildTenant());
    const useCase = new SetTenantActiveUseCase({
      tenantRepository,
      clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    });

    const result = await useCase.execute(platformCtx, { tenantId: 't1', ativo: false });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ativo).toBe(false);
    expect(result.value.status).toBe('inactive');
  });

  it('retorna not_found para tenant inexistente', async () => {
    const tenantRepository = new InMemoryTenantRepository();
    const useCase = new SetTenantActiveUseCase({
      tenantRepository,
      clock: new FixedClock(),
    });

    const result = await useCase.execute(platformCtx, { tenantId: 'inexistente', ativo: false });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('rejeita quem não é Administrador Geral', async () => {
    const tenantRepository = new InMemoryTenantRepository();
    await tenantRepository.create(buildTenant());
    const useCase = new SetTenantActiveUseCase({
      tenantRepository,
      clock: new FixedClock(),
    });
    const tenantCtx: AuthContext = {
      uid: 'admin-loja',
      tenantId: 't1',
      roleId: 'admin',
      permissions: ['tenant:manage'],
    };

    await expect(useCase.execute(tenantCtx, { tenantId: 't1', ativo: false })).rejects.toThrow(
      'Permissão ausente: platform:admin.',
    );
  });
});
