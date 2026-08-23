import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { BoardTerm } from '../entities/board-term.entity';
import type { IBoardTermRepository } from '../repositories/board-term.repository';

export interface FindBoardTermForDateDeps {
  boardTermRepository: IBoardTermRepository;
}

/**
 * Identificação automática da Gestão vigente numa data — Fase 1 da
 * Fundação do Acervo VL6 (docs/architecture/11-acervo-vl6.md §11.5). Só
 * consulta (`boardTerm:read`, nunca exige permissão de escrita): usada por
 * `CreateArchiveItemUseCase` para preencher `boardTermId` a partir da data
 * do Evento, sem bloquear a criação quando não há Gestão cadastrada para a
 * data (retorna `null` nesse caso).
 */
export class FindBoardTermForDateUseCase {
  constructor(private readonly deps: FindBoardTermForDateDeps) {}

  async execute(ctx: AuthContext, date: Date): Promise<BoardTerm | null> {
    requirePermission(ctx, 'boardTerm:read');
    return this.deps.boardTermRepository.findByDate(ctx.tenantId, date);
  }
}
