import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryLinkRepository } from '../../../test/fakes';
import type { Link } from '../entities/link.entity';
import { UpdateLinkUseCase, type UpdateLinkInput } from './update-link.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['link:update'],
};

function buildLink(overrides: Partial<Link> = {}): Link {
  return {
    id: 'link-1',
    tenantId: 't1',
    titulo: 'Portal GLEG',
    url: 'https://gleg.org.br',
    descricao: null,
    icone: null,
    categoria: 'institucional',
    tipoAcesso: 'externo',
    destaque: false,
    ordem: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildInput(overrides: Partial<UpdateLinkInput> = {}): UpdateLinkInput {
  return {
    titulo: 'Portal da GLEG',
    url: 'https://gleg.org.br',
    descricao: 'Portal oficial da potência.',
    icone: null,
    categoria: 'institucional',
    tipoAcesso: 'externo',
    destaque: true,
    ordem: 1,
    ...overrides,
  };
}

function buildUseCase() {
  const linkRepository = new InMemoryLinkRepository();
  const useCase = new UpdateLinkUseCase({
    linkRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, linkRepository };
}

describe('UpdateLinkUseCase', () => {
  it('atualiza os campos do link', async () => {
    const { useCase, linkRepository } = buildUseCase();
    await linkRepository.create(buildLink());

    const result = await useCase.execute(ctx, 'link-1', buildInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.titulo).toBe('Portal da GLEG');
    expect(result.value.destaque).toBe(true);
  });

  it('rejeita link inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'nao-existe', buildInput());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError sem a permissão link:update', async () => {
    const { useCase, linkRepository } = buildUseCase();
    await linkRepository.create(buildLink());

    await expect(
      useCase.execute({ ...ctx, permissions: [] }, 'link-1', buildInput()),
    ).rejects.toThrow(ForbiddenError);
  });
});
