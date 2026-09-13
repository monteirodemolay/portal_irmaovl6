import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  err,
  ok,
  type Result,
} from '../../../shared/result';
import type { LinkSuggestion } from '../entities/link-suggestion.entity';
import type { ILinkSuggestionRepository } from '../repositories/link-suggestion.repository';

export interface RejectLinkSuggestionDeps {
  suggestionRepository: ILinkSuggestionRepository;
  clock: IClock;
}

export class RejectLinkSuggestionUseCase {
  constructor(private readonly deps: RejectLinkSuggestionDeps) {}

  async execute(
    ctx: AuthContext,
    suggestionId: string,
    motivoRejeicao: string,
  ): Promise<Result<LinkSuggestion>> {
    requirePermission(ctx, 'link:manage');

    if (!motivoRejeicao.trim()) {
      return err(new ValidationError('Informe o motivo da rejeição.'));
    }

    const suggestion = await this.deps.suggestionRepository.findById(suggestionId);
    if (!suggestion || suggestion.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('LinkSuggestion', suggestionId));
    }
    if (suggestion.revisaoStatus !== 'pendente') {
      return err(new ConflictError('Esta sugestão já foi revisada.'));
    }

    const now = this.deps.clock.now();
    const updated: LinkSuggestion = {
      ...suggestion,
      revisaoStatus: 'rejeitada',
      motivoRejeicao: motivoRejeicao.trim(),
      revisadoPor: ctx.uid,
      revisadoEm: now,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.suggestionRepository.update(updated);

    return ok(updated);
  }
}
