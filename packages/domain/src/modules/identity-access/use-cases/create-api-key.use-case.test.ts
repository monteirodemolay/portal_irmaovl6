import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FakeApiKeyGenerator,
  FixedClock,
  InMemoryApiKeyRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateApiKeyUseCase } from './create-api-key.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'admin',
  permissions: ['tenant:manage', 'member:read'],
};

function buildUseCase() {
  const apiKeyRepository = new InMemoryApiKeyRepository();
  const useCase = new CreateApiKeyUseCase({
    apiKeyRepository,
    apiKeyGenerator: new FakeApiKeyGenerator(),
    clock: new FixedClock(),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, apiKeyRepository };
}

describe('CreateApiKeyUseCase', () => {
  it('cria a chave e devolve o texto puro uma única vez', async () => {
    const { useCase, apiKeyRepository } = buildUseCase();

    const result = await useCase.execute(ctx, {
      nome: 'Integração X',
      permissoes: ['member:read'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.plainTextKey).toContain('vl6_test_');
    expect(result.value.apiKey.tenantId).toBe('t1');
    expect(result.value.apiKey.permissoes).toEqual(['member:read']);

    const persisted = await apiKeyRepository.findById(result.value.apiKey.id);
    expect(persisted?.keyHash).toBeTruthy();
  });

  it('rejeita permissões que o emissor não tem', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, { nome: 'X', permissoes: ['user:manage'] });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
  });

  it('rejeita lista de permissões vazia', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, { nome: 'X', permissoes: [] });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
  });

  it('rejeita quem não tem permissão tenant:manage', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(
      useCase.execute(ctxSemPermissao, { nome: 'X', permissoes: ['member:read'] }),
    ).rejects.toThrow('Permissão ausente: tenant:manage.');
  });
});
