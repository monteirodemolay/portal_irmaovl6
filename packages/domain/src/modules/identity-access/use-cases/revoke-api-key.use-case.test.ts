import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryApiKeyRepository } from '../../../test/fakes';
import type { ApiKey } from '../entities/api-key.entity';
import { RevokeApiKeyUseCase } from './revoke-api-key.use-case';

function buildApiKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id: 'key-1',
    tenantId: 't1',
    nome: 'Integração X',
    keyPrefix: 'vl6_test_1',
    keyHash: 'hash',
    permissoes: ['member:read'],
    ultimoUso: null,
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

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'admin',
  permissions: ['tenant:manage'],
};

describe('RevokeApiKeyUseCase', () => {
  it('revoga (soft delete) a chave', async () => {
    const apiKeyRepository = new InMemoryApiKeyRepository();
    await apiKeyRepository.create(buildApiKey());
    const useCase = new RevokeApiKeyUseCase({
      apiKeyRepository,
      clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    });

    const result = await useCase.execute(ctx, { apiKeyId: 'key-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.deletedAt).toEqual(new Date('2026-06-01T00:00:00Z'));
    expect(result.value.ativo).toBe(false);
  });

  it('rejeita revogar chave de outro tenant', async () => {
    const apiKeyRepository = new InMemoryApiKeyRepository();
    await apiKeyRepository.create(buildApiKey({ tenantId: 't2' }));
    const useCase = new RevokeApiKeyUseCase({ apiKeyRepository, clock: new FixedClock() });

    const result = await useCase.execute(ctx, { apiKeyId: 'key-1' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('forbidden');
  });

  it('retorna not_found para chave inexistente', async () => {
    const apiKeyRepository = new InMemoryApiKeyRepository();
    const useCase = new RevokeApiKeyUseCase({ apiKeyRepository, clock: new FixedClock() });

    const result = await useCase.execute(ctx, { apiKeyId: 'inexistente' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
