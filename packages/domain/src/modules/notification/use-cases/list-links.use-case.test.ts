import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryLinkRepository } from '../../../test/fakes';
import type { Link } from '../entities/link.entity';
import { ListActiveLinksUseCase, ListAllLinksUseCase } from './list-links.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: ['link:read'] };

function buildLink(overrides: Partial<Link> = {}): Link {
  return {
    id: 'link-1',
    tenantId: 't1',
    titulo: 'Portal GLEG',
    url: 'https://gleg.org.br',
    icone: null,
    categoria: 'institucional',
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

describe('ListActiveLinksUseCase', () => {
  it('exige a permissão link:read', async () => {
    const repo = new InMemoryLinkRepository();
    const useCase = new ListActiveLinksUseCase({ linkRepository: repo });
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao)).rejects.toThrow(ForbiddenError);
  });

  it('lista apenas os links ativos', async () => {
    const repo = new InMemoryLinkRepository();
    await repo.create(buildLink());
    await repo.create(buildLink({ id: 'link-2', ativo: false }));
    const useCase = new ListActiveLinksUseCase({ linkRepository: repo });

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('link-1');
  });
});

describe('ListAllLinksUseCase', () => {
  it('exige a permissão link:read', async () => {
    const repo = new InMemoryLinkRepository();
    const useCase = new ListAllLinksUseCase({ linkRepository: repo });
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao)).rejects.toThrow(ForbiddenError);
  });

  it('lista todos os links, inclusive os inativos', async () => {
    const repo = new InMemoryLinkRepository();
    await repo.create(buildLink());
    await repo.create(buildLink({ id: 'link-2', ativo: false }));
    const useCase = new ListAllLinksUseCase({ linkRepository: repo });

    const result = await useCase.execute(ctx);

    expect(result.map((l) => l.id).sort()).toEqual(['link-1', 'link-2']);
  });
});
