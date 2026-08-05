import { describe, expect, it } from 'vitest';
import { InMemoryTenantRepository } from '../../../test/fakes';
import type { Tenant } from '../entities/tenant.entity';
import { ResolveTenantByHostUseCase } from './resolve-tenant-by-host.use-case';

function buildTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 't1',
    tenantId: 't1',
    nome: 'Loja Maçônica Verdadeira Luz nº 06',
    numero: '6',
    potencia: 'GLEG',
    dominio: null,
    subdominio: 'vl6',
    endereco: null,
    telefone: null,
    whatsapp: null,
    site: null,
    email: 'contato@vl6.org.br',
    modulosHabilitados: [],
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
  const tenantRepository = new InMemoryTenantRepository();
  const useCase = new ResolveTenantByHostUseCase({ tenantRepository });
  return { useCase, tenantRepository };
}

describe('ResolveTenantByHostUseCase', () => {
  it('resolve por domínio customizado, ignorando a porta do host', async () => {
    const { useCase, tenantRepository } = buildUseCase();
    await tenantRepository.create(buildTenant({ dominio: 'www.vl6.org.br' }));

    const result = await useCase.execute('www.vl6.org.br:3000');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe('t1');
  });

  it('resolve por subdomínio quando não há domínio customizado correspondente', async () => {
    const { useCase, tenantRepository } = buildUseCase();
    await tenantRepository.create(buildTenant());

    const result = await useCase.execute('vl6.portaldoirmao.app');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe('t1');
  });

  it('retorna not_found quando nenhum tenant corresponde ao host', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute('desconhecido.portaldoirmao.app');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('retorna not_found quando o tenant encontrado está inativo', async () => {
    const { useCase, tenantRepository } = buildUseCase();
    await tenantRepository.create(buildTenant({ ativo: false }));

    const result = await useCase.execute('vl6.portaldoirmao.app');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
