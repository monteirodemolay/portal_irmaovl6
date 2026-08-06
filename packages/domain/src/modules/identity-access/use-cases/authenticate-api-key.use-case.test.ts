import { describe, expect, it } from 'vitest';
import { FakeApiKeyGenerator, FixedClock, InMemoryApiKeyRepository } from '../../../test/fakes';
import type { ApiKey } from '../entities/api-key.entity';
import { AuthenticateApiKeyUseCase, API_KEY_ROLE_ID } from './authenticate-api-key.use-case';

function buildApiKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id: 'key-1',
    tenantId: 't1',
    nome: 'Integração X',
    keyPrefix: 'vl6_test_1',
    keyHash: 'hash(vl6_test_1)',
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

function buildUseCase() {
  const apiKeyRepository = new InMemoryApiKeyRepository();
  const useCase = new AuthenticateApiKeyUseCase({
    apiKeyRepository,
    apiKeyGenerator: new FakeApiKeyGenerator(),
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, apiKeyRepository };
}

describe('AuthenticateApiKeyUseCase', () => {
  it('autentica uma chave válida e registra ultimoUso', async () => {
    const { useCase, apiKeyRepository } = buildUseCase();
    await apiKeyRepository.create(buildApiKey());

    const result = await useCase.execute({ plainTextKey: 'vl6_test_1' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tenantId).toBe('t1');
    expect(result.value.roleId).toBe(API_KEY_ROLE_ID);
    expect(result.value.permissions).toEqual(['member:read']);

    const persisted = await apiKeyRepository.findById('key-1');
    expect(persisted?.ultimoUso).toEqual(new Date('2026-06-01T00:00:00Z'));
  });

  it('rejeita chave inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute({ plainTextKey: 'nao-existe' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('rejeita chave revogada', async () => {
    const { useCase, apiKeyRepository } = buildUseCase();
    await apiKeyRepository.create(buildApiKey({ deletedAt: new Date(), ativo: false }));

    const result = await useCase.execute({ plainTextKey: 'vl6_test_1' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('forbidden');
  });
});
