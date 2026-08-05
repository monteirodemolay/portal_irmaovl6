import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, ok, err, type Result } from '../../../shared/result';
import type { BoardTerm } from '../entities/board-term.entity';
import type { IBoardTermRepository } from '../repositories/board-term.repository';

export interface CreateBoardTermInput {
  nome: string;
  periodoInicio: Date;
  periodoFim: Date;
}

export interface CreateBoardTermDeps {
  boardTermRepository: IBoardTermRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/** Cria uma gestão anual. Períodos não podem se sobrepor — docs/architecture/06 §6.2. */
export class CreateBoardTermUseCase {
  constructor(private readonly deps: CreateBoardTermDeps) {}

  async execute(ctx: AuthContext, input: CreateBoardTermInput): Promise<Result<BoardTerm>> {
    requirePermission(ctx, 'boardTerm:manage');

    if (input.periodoFim <= input.periodoInicio) {
      return err(new ConflictError('O período final deve ser posterior ao período inicial.'));
    }

    const overlaps = await this.deps.boardTermRepository.overlaps(
      ctx.tenantId,
      input.periodoInicio,
      input.periodoFim,
    );
    if (overlaps) {
      return err(new ConflictError('Já existe uma gestão cujo período se sobrepõe a este.'));
    }

    const now = this.deps.clock.now();
    const term: BoardTerm = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      nome: input.nome,
      periodoInicio: input.periodoInicio,
      periodoFim: input.periodoFim,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.boardTermRepository.create(term);

    return ok(term);
  }
}
