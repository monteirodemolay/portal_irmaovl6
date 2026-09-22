import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, ok, err, type Result } from '../../../shared/result';
import type { IArchiveItemRepository } from '../../archive/repositories/archive-item.repository';
import { relinkOrphanArchiveItems } from '../../archive/lib/relink-orphan-archive-items';
import type { IEventRepository } from '../../agenda/repositories/event.repository';
import type { BoardTerm } from '../entities/board-term.entity';
import type { IBoardTermRepository } from '../repositories/board-term.repository';

export interface CreateBoardTermInput {
  nome: string;
  periodoInicio: Date;
  periodoFim: Date;
  /**
   * Confirmação explícita do Administrador de que a sobreposição com outra
   * gestão já cadastrada é intencional (ex.: troca de Venerável Mestre no
   * meio do ano — duas gestões distintas cobrindo o mesmo período nominal
   * "20XX/20XX+1"). Sem isso, `overlaps()` sempre bloqueia — a maioria das
   * sobreposições é erro de digitação, não histórico legítimo.
   */
  permitirSobreposicao?: boolean;
}

export interface CreateBoardTermDeps {
  boardTermRepository: IBoardTermRepository;
  eventRepository: IEventRepository;
  archiveItemRepository: IArchiveItemRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Cria uma gestão anual. Períodos não podem se sobrepor — docs/architecture/06
 * §6.2. Depois de gravada, vincula sozinha (`relinkOrphanArchiveItems`) todo
 * Evento/item do Acervo VL6 dentro do período que ainda estava sem Gestão —
 * cobre o caso de a Loja registrar iniciação/elevação/exaltação ANTES de o
 * Administrador cadastrar a Gestão do ano no Portal (ordem que antes exigia
 * rodar o botão manual de correção em massa depois).
 */
export class CreateBoardTermUseCase {
  constructor(private readonly deps: CreateBoardTermDeps) {}

  async execute(ctx: AuthContext, input: CreateBoardTermInput): Promise<Result<BoardTerm>> {
    requirePermission(ctx, 'boardTerm:manage');

    if (input.periodoFim <= input.periodoInicio) {
      return err(new ConflictError('O período final deve ser posterior ao período inicial.'));
    }

    if (!input.permitirSobreposicao) {
      const overlaps = await this.deps.boardTermRepository.overlaps(
        ctx.tenantId,
        input.periodoInicio,
        input.periodoFim,
      );
      if (overlaps) {
        return err(new ConflictError('Já existe uma gestão cujo período se sobrepõe a este.'));
      }
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
    await relinkOrphanArchiveItems(this.deps, ctx.tenantId, ctx.uid, term);

    return ok(term);
  }
}
