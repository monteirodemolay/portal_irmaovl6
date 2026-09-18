import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { BoardTerm } from '../entities/board-term.entity';
import type { IBoardTermRepository } from '../repositories/board-term.repository';

export interface UpdateBoardTermInput {
  nome: string;
  periodoInicio: Date;
  periodoFim: Date;
}

export interface UpdateBoardTermDeps {
  boardTermRepository: IBoardTermRepository;
  clock: IClock;
}

/**
 * Edita nome/período de uma gestão já cadastrada — corrige convenções de
 * nomenclatura sem precisar recriar o registro (ex.: "Gestão 2026/2027" →
 * "2026/2027", pra não duplicar "Gestão" onde a UI já antepõe essa palavra).
 */
export class UpdateBoardTermUseCase {
  constructor(private readonly deps: UpdateBoardTermDeps) {}

  async execute(
    ctx: AuthContext,
    termId: string,
    input: UpdateBoardTermInput,
  ): Promise<Result<BoardTerm>> {
    requirePermission(ctx, 'boardTerm:manage');

    const existing = await this.deps.boardTermRepository.findById(termId);
    if (!existing || existing.tenantId !== ctx.tenantId || existing.deletedAt) {
      return err(new NotFoundError('BoardTerm', termId));
    }

    if (input.periodoFim <= input.periodoInicio) {
      return err(new ConflictError('O período final deve ser posterior ao período inicial.'));
    }

    const overlaps = await this.deps.boardTermRepository.overlaps(
      ctx.tenantId,
      input.periodoInicio,
      input.periodoFim,
      termId,
    );
    if (overlaps) {
      return err(new ConflictError('Já existe uma gestão cujo período se sobrepõe a este.'));
    }

    const updated: BoardTerm = {
      ...existing,
      nome: input.nome,
      periodoInicio: input.periodoInicio,
      periodoFim: input.periodoFim,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.boardTermRepository.update(updated);

    return ok(updated);
  }
}
