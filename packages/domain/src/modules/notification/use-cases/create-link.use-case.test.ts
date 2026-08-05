import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryLinkRepository, SequentialIdGenerator } from '../../../test/fakes';
import { CreateLinkUseCase, type CreateLinkInput } from './create-link.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['link:create'],
};

function buildInput(overrides: Partial<CreateLinkInput> = {}): CreateLinkInput {
  return {
    titulo: 'Portal GLEG',
    url: 'https://gleg.org.br',
    icone: null,
    categoria: 'institucional',
    ordem: 0,
    ...overrides,
  };
}

function buildUseCase() {
  const linkRepository = new InMemoryLinkRepository();
  const useCase = new CreateLinkUseCase({
    linkRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, linkRepository };
}

describe('CreateLinkUseCase', () => {
  it('exige a permissão link:create', async () => {
    const { useCase } = buildUseCase();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, buildInput())).rejects.toThrow(ForbiddenError);
  });

  it('cria o link já ativo por padrão', async () => {
    const { useCase, linkRepository } = buildUseCase();

    const result = await useCase.execute(ctx, buildInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.titulo).toBe('Portal GLEG');
    expect(result.value.ativo).toBe(true);
    expect(await linkRepository.findById(result.value.id)).not.toBeNull();
  });
});
