import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { LinkSuggestion } from '../entities/link-suggestion.entity';
import type { ILinkSuggestionRepository } from '../repositories/link-suggestion.repository';

export interface ListPendingLinkSuggestionsDeps {
  suggestionRepository: ILinkSuggestionRepository;
}

/** Fila de moderação — só quem cadastra Links (`link:manage`) vê as sugestões pendentes. */
export class ListPendingLinkSuggestionsUseCase {
  constructor(private readonly deps: ListPendingLinkSuggestionsDeps) {}

  async execute(ctx: AuthContext): Promise<LinkSuggestion[]> {
    requirePermission(ctx, 'link:manage');
    return this.deps.suggestionRepository.listPendingByTenant(ctx.tenantId);
  }
}
