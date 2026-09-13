import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { LinkSuggestion } from '../entities/link-suggestion.entity';
import type { ILinkSuggestionRepository } from '../repositories/link-suggestion.repository';

export interface SubmitLinkSuggestionInput {
  titulo: string;
  url: string;
  descricao: string | null;
}

export interface SubmitLinkSuggestionDeps {
  suggestionRepository: ILinkSuggestionRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/** "Sugerir um link" — qualquer Irmão autenticado, sem `requirePermission` (ação pessoal, não institucional). */
export class SubmitLinkSuggestionUseCase {
  constructor(private readonly deps: SubmitLinkSuggestionDeps) {}

  async execute(
    ctx: AuthContext,
    input: SubmitLinkSuggestionInput,
  ): Promise<Result<LinkSuggestion>> {
    const now = this.deps.clock.now();
    const suggestion: LinkSuggestion = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      memberId: ctx.uid,
      titulo: input.titulo,
      url: input.url,
      descricao: input.descricao,
      revisaoStatus: 'pendente',
      motivoRejeicao: null,
      revisadoPor: null,
      revisadoEm: null,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };

    await this.deps.suggestionRepository.create(suggestion);
    return ok(suggestion);
  }
}
