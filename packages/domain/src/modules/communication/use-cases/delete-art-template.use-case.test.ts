import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  SequentialIdGenerator,
  InMemoryArtTemplateRepository,
} from '../../../test/fakes';
import { CreateArtTemplateUseCase } from './create-art-template.use-case';
import { DeleteArtTemplateUseCase } from './delete-art-template.use-case';

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

describe('DeleteArtTemplateUseCase', () => {
  it('exclui o modelo (soft-delete) e some da listagem', async () => {
    const artTemplateRepository = new InMemoryArtTemplateRepository();
    const clock = new FixedClock();
    const created = await new CreateArtTemplateUseCase({
      artTemplateRepository,
      clock,
      idGenerator: new SequentialIdGenerator(),
    }).execute(ctx, input);
    if (!created.ok) throw new Error('setup falhou');

    const useCase = new DeleteArtTemplateUseCase({ artTemplateRepository, clock });
    const result = await useCase.execute(ctx, created.value.id);

    expect(result.ok).toBe(true);
    const deleted = await artTemplateRepository.findById(created.value.id);
    expect(deleted?.deletedAt).not.toBeNull();
    expect(deleted?.active).toBe(false);
    expect(deleted?.ativo).toBe(false);
    expect(deleted?.status).toBe('archived');
  });

  it('retorna NotFoundError pra modelo inexistente', async () => {
    const artTemplateRepository = new InMemoryArtTemplateRepository();
    const useCase = new DeleteArtTemplateUseCase({
      artTemplateRepository,
      clock: new FixedClock(),
    });

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('bloqueia sem communication:manage', async () => {
    const artTemplateRepository = new InMemoryArtTemplateRepository();
    const useCase = new DeleteArtTemplateUseCase({
      artTemplateRepository,
      clock: new FixedClock(),
    });

    await expect(useCase.execute(ctxSemPermissao, 'qualquer')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });
});
