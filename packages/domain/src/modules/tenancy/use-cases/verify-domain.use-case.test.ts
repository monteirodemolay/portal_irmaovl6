import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryTenantDomainVerificationRepository,
  InMemoryTenantRepository,
} from '../../../test/fakes';
import type { IDnsResolver } from '../services/dns-resolver';
import type { Tenant } from '../entities/tenant.entity';
import { VerifyDomainUseCase } from './verify-domain.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'role-admin',
  permissions: ['tenant:manage'],
};

class FakeDnsResolver implements IDnsResolver {
  constructor(private readonly records: Record<string, string[]>) {}
  async resolveTxt(hostname: string) {
    return this.records[hostname] ?? [];
  }
}

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

function buildUseCase(dnsRecords: Record<string, string[]> = {}) {
  const domainVerificationRepository = new InMemoryTenantDomainVerificationRepository();
  const tenantRepository = new InMemoryTenantRepository();
  const useCase = new VerifyDomainUseCase({
    domainVerificationRepository,
    tenantRepository,
    dnsResolver: new FakeDnsResolver(dnsRecords),
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, domainVerificationRepository, tenantRepository };
}

describe('VerifyDomainUseCase', () => {
  it('ativa Tenant.dominio quando o TXT record contém o token', async () => {
    const { useCase, domainVerificationRepository, tenantRepository } = buildUseCase({
      '_vl6-verify.minhaloja.com': ['token-correto'],
    });
    await domainVerificationRepository.create({
      id: 'minhaloja.com',
      tenantId: 't1',
      token: 'token-correto',
      verified: false,
      createdAt: new Date(),
      verifiedAt: null,
    });
    await tenantRepository.create(buildTenant());

    const result = await useCase.execute(ctx, { domain: 'minhaloja.com' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.verified).toBe(true);

    const tenant = await tenantRepository.findById('t1');
    expect(tenant?.dominio).toBe('minhaloja.com');
  });

  it('não ativa e devolve verified: false quando o TXT record ainda não propagou', async () => {
    const { useCase, domainVerificationRepository, tenantRepository } = buildUseCase({});
    await domainVerificationRepository.create({
      id: 'minhaloja.com',
      tenantId: 't1',
      token: 'token-correto',
      verified: false,
      createdAt: new Date(),
      verifiedAt: null,
    });
    await tenantRepository.create(buildTenant());

    const result = await useCase.execute(ctx, { domain: 'minhaloja.com' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.verified).toBe(false);

    const tenant = await tenantRepository.findById('t1');
    expect(tenant?.dominio).toBeNull();
  });

  it('rejeita verificar domínio de outro tenant', async () => {
    const { useCase, domainVerificationRepository } = buildUseCase({
      '_vl6-verify.minhaloja.com': ['token-correto'],
    });
    await domainVerificationRepository.create({
      id: 'minhaloja.com',
      tenantId: 't2',
      token: 'token-correto',
      verified: false,
      createdAt: new Date(),
      verifiedAt: null,
    });

    const result = await useCase.execute(ctx, { domain: 'minhaloja.com' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('forbidden');
  });

  it('retorna not_found quando não há solicitação para o domínio', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, { domain: 'nunca-pedido.com' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
