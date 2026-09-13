import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ConflictError, NotFoundError, err, ok, type Result } from '../../../shared/result';
import type { LinkSuggestion } from '../entities/link-suggestion.entity';
import type { ILinkSuggestionRepository } from '../repositories/link-suggestion.repository';

export interface ApproveLinkSuggestionDeps {
  suggestionRepository: ILinkSuggestionRepository;
  clock: IClock;
}

/**
 * Marca a sugestão como aprovada — não cria o `Link` sozinho (ver
 * comentário de `LinkSuggestion`); o Administrador cadastra o Link de
 * verdade pela tela de "Novo Link", escolhendo categoria/tipo de acesso/
 * destaque, normalmente pré-preenchendo título/URL/descrição a partir
 * desta mesma sugestão.
 */
export class ApproveLinkSuggestionUseCase {
  constructor(private readonly deps: ApproveLinkSuggestionDeps) {}

  async execute(ctx: AuthContext, suggestionId: string): Promise<Result<LinkSuggestion>> {
    requirePermission(ctx, 'link:manage');

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
      revisaoStatus: 'aprovada',
      revisadoPor: ctx.uid,
      revisadoEm: now,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.suggestionRepository.update(updated);

    return ok(updated);
  }
}
