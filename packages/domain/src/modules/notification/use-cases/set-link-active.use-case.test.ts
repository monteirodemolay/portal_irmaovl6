import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryLinkRepository } from '../../../test/fakes';
import type { Link } from '../entities/link.entity';
import { SetLinkActiveUseCase } from './set-link-active.use-case';

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

describe('SetLinkActiveUseCase', () => {
  it('desativa um link ativo', async () => {
    const linkRepository = new InMemoryLinkRepository();
    await linkRepository.create(buildLink());
    const useCase = new SetLinkActiveUseCase({
      linkRepository,
      clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    });

    const result = await useCase.execute(ctx, 'link-1', false);

    expect(result.ok).toBe(true);
    const stored = await linkRepository.findById('link-1');
    expect(stored?.ativo).toBe(false);
  });

  it('lança ForbiddenError sem a permissão link:update', async () => {
    const linkRepository = new InMemoryLinkRepository();
    await linkRepository.create(buildLink());
    const useCase = new SetLinkActiveUseCase({
      linkRepository,
      clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    });

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'link-1', false)).rejects.toThrow(
      ForbiddenError,
    );
  });
});
