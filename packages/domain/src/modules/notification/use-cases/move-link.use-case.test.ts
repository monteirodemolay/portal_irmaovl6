import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryLinkRepository } from '../../../test/fakes';
import type { Link } from '../entities/link.entity';
import { MoveLinkUseCase } from './move-link.use-case';

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

function buildUseCase() {
  const linkRepository = new InMemoryLinkRepository();
  const useCase = new MoveLinkUseCase({
    linkRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, linkRepository };
}

describe('MoveLinkUseCase', () => {
  it('troca a ordem com o vizinho de baixo', async () => {
    const { useCase, linkRepository } = buildUseCase();
    await linkRepository.create(buildLink({ id: 'link-1', ordem: 0 }));
    await linkRepository.create(buildLink({ id: 'link-2', ordem: 1 }));

    const result = await useCase.execute(ctx, 'link-1', 'down');

    expect(result.ok).toBe(true);
    expect((await linkRepository.findById('link-1'))?.ordem).toBe(1);
    expect((await linkRepository.findById('link-2'))?.ordem).toBe(0);
  });

  it('não faz nada ao mover o primeiro item pra cima', async () => {
    const { useCase, linkRepository } = buildUseCase();
    await linkRepository.create(buildLink({ id: 'link-1', ordem: 0 }));
    await linkRepository.create(buildLink({ id: 'link-2', ordem: 1 }));

    const result = await useCase.execute(ctx, 'link-1', 'up');

    expect(result.ok).toBe(true);
    expect((await linkRepository.findById('link-1'))?.ordem).toBe(0);
  });

  it('lança ForbiddenError sem a permissão link:update', async () => {
    const { useCase, linkRepository } = buildUseCase();
    await linkRepository.create(buildLink());

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'link-1', 'down')).rejects.toThrow(
      ForbiddenError,
    );
  });
});
