import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  SequentialIdGenerator,
  InMemoryArtTemplateRepository,
} from '../../../test/fakes';
import { CreateArtTemplateUseCase } from './create-art-template.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['communication:manage'],
};

const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

const input = {
  name: 'Hoje Tem Sessão',
  type: 'session' as const,
  backgroundUrl: 'https://example.com/template-sessao.png',
  backgroundWidth: 1294,
  backgroundHeight: 2048,
  outputFormats: ['feed' as const],
  fields: [],
};

describe('CreateArtTemplateUseCase', () => {
  it('cria o modelo na versão 1, ativo', async () => {
    const artTemplateRepository = new InMemoryArtTemplateRepository();
    const useCase = new CreateArtTemplateUseCase({
      artTemplateRepository,
      clock: new FixedClock(),
      idGenerator: new SequentialIdGenerator(),
    });

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.version).toBe(1);
      expect(result.value.active).toBe(true);
      expect(result.value.tenantId).toBe('t1');
    }
  });

  it('bloqueia sem communication:manage', async () => {
    const artTemplateRepository = new InMemoryArtTemplateRepository();
    const useCase = new CreateArtTemplateUseCase({
      artTemplateRepository,
      clock: new FixedClock(),
      idGenerator: new SequentialIdGenerator(),
    });

    await expect(useCase.execute(ctxSemPermissao, input)).rejects.toBeInstanceOf(ForbiddenError);
  });
});
