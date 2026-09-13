import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryLinkSuggestionRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { SubmitLinkSuggestionUseCase } from './submit-link-suggestion.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

describe('SubmitLinkSuggestionUseCase', () => {
  it('cria a sugestão como pendente', async () => {
    const suggestionRepository = new InMemoryLinkSuggestionRepository();
    const useCase = new SubmitLinkSuggestionUseCase({
      suggestionRepository,
      clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
      idGenerator: new SequentialIdGenerator(),
    });

    const result = await useCase.execute(ctx, {
      titulo: 'Site da Loja irmã',
      url: 'https://exemplo.org.br',
      descricao: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.revisaoStatus).toBe('pendente');
    expect(result.value.memberId).toBe('u1');
    expect(await suggestionRepository.listPendingByTenant('t1')).toHaveLength(1);
  });
});
