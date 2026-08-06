import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryTenantRepository } from '../../../test/fakes';
import type { Tenant } from '../entities/tenant.entity';
import { ListAllTenantsUseCase } from './list-all-tenants.use-case';

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
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'system',
    updatedBy: 'system',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('ListAllTenantsUseCase', () => {
  it('lista todos os tenants para o Administrador Geral', async () => {
    const tenantRepository = new InMemoryTenantRepository();
    await tenantRepository.create(buildTenant({ id: 't1' }));
    await tenantRepository.create(buildTenant({ id: 't2' }));
    const useCase = new ListAllTenantsUseCase({ tenantRepository });

    const platformCtx: AuthContext = {
      uid: 'geral',
      tenantId: 'platform',
      roleId: 'super_admin',
      permissions: [],
    };
    const result = await useCase.execute(platformCtx);

    expect(result).toHaveLength(2);
  });

  it('rejeita quem não é Administrador Geral', async () => {
    const tenantRepository = new InMemoryTenantRepository();
    const useCase = new ListAllTenantsUseCase({ tenantRepository });

    const tenantCtx: AuthContext = {
      uid: 'admin-loja',
      tenantId: 't1',
      roleId: 'admin',
      permissions: ['tenant:manage'],
    };

    await expect(useCase.execute(tenantCtx)).rejects.toThrow('Permissão ausente: platform:admin.');
  });
});
