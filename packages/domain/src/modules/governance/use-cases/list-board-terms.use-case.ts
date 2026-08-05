import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { BoardTerm } from '../entities/board-term.entity';
import type { IBoardTermRepository } from '../repositories/board-term.repository';

export interface ListBoardTermsDeps {
  boardTermRepository: IBoardTermRepository;
}

export class ListBoardTermsUseCase {
  constructor(private readonly deps: ListBoardTermsDeps) {}

  async execute(ctx: AuthContext): Promise<BoardTerm[]> {
    requirePermission(ctx, 'boardTerm:read');
    return this.deps.boardTermRepository.listByTenant(ctx.tenantId);
  }
}
