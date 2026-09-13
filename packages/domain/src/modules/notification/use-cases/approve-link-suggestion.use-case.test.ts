import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ConflictError, ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryLinkSuggestionRepository } from '../../../test/fakes';
import type { LinkSuggestion } from '../entities/link-suggestion.entity';
import { ApproveLinkSuggestionUseCase } from './approve-link-suggestion.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['link:manage'],
};

function buildSuggestion(overrides: Partial<LinkSuggestion> = {}): LinkSuggestion {
  return {
    id: 'sug-1',
    tenantId: 't1',
    memberId: 'u1',
    titulo: 'Site da Loja irmã',
    url: 'https://exemplo.org.br',
    descricao: null,
    revisaoStatus: 'pendente',
    motivoRejeicao: null,
    revisadoPor: null,
    revisadoEm: null,
    createdAt: new Date('2026-05-01'),
    updatedAt: new Date('2026-05-01'),
    createdBy: 'u1',
    updatedBy: 'u1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('ApproveLinkSuggestionUseCase', () => {
  it('aprova uma sugestão pendente', async () => {
    const suggestionRepository = new InMemoryLinkSuggestionRepository();
    await suggestionRepository.create(buildSuggestion());
    const useCase = new ApproveLinkSuggestionUseCase({
      suggestionRepository,
      clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    });

    const result = await useCase.execute(ctx, 'sug-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.revisaoStatus).toBe('aprovada');
    expect(result.value.revisadoPor).toBe('admin-1');
  });

  it('rejeita reaprovar uma sugestão já revisada', async () => {
    const suggestionRepository = new InMemoryLinkSuggestionRepository();
    await suggestionRepository.create(buildSuggestion({ revisaoStatus: 'aprovada' }));
    const useCase = new ApproveLinkSuggestionUseCase({
      suggestionRepository,
      clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    });

    const result = await useCase.execute(ctx, 'sug-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ConflictError);
  });

  it('lança ForbiddenError sem a permissão link:manage', async () => {
    const suggestionRepository = new InMemoryLinkSuggestionRepository();
    await suggestionRepository.create(buildSuggestion());
    const useCase = new ApproveLinkSuggestionUseCase({
      suggestionRepository,
      clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    });

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'sug-1')).rejects.toThrow(
      ForbiddenError,
    );
  });
});
