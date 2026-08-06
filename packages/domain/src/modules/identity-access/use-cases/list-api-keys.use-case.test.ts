import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryApiKeyRepository } from '../../../test/fakes';
import type { ApiKey } from '../entities/api-key.entity';
import { ListApiKeysUseCase } from './list-api-keys.use-case';

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

describe('ListApiKeysUseCase', () => {
  it('lista só as chaves do próprio tenant', async () => {
    const apiKeyRepository = new InMemoryApiKeyRepository();
    await apiKeyRepository.create(buildApiKey({ id: 'k1', tenantId: 't1' }));
    await apiKeyRepository.create(buildApiKey({ id: 'k2', tenantId: 't2' }));
    const useCase = new ListApiKeysUseCase({ apiKeyRepository });

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('k1');
  });

  it('rejeita quem não tem permissão tenant:manage', async () => {
    const apiKeyRepository = new InMemoryApiKeyRepository();
    const useCase = new ListApiKeysUseCase({ apiKeyRepository });
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(ctxSemPermissao)).rejects.toThrow(
      'Permissão ausente: tenant:manage.',
    );
  });
});
