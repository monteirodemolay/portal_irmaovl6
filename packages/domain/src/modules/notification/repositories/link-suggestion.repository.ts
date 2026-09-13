import type { LinkSuggestion } from '../entities/link-suggestion.entity';

export interface ILinkSuggestionRepository {
  findById(id: string): Promise<LinkSuggestion | null>;
  /** Fila de moderação — admin, ordenada da mais recente para a mais antiga. */
  listPendingByTenant(tenantId: string): Promise<LinkSuggestion[]>;
  create(suggestion: LinkSuggestion): Promise<void>;
  update(suggestion: LinkSuggestion): Promise<void>;
}
