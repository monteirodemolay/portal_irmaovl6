import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Committee } from '../entities/committee.entity';
import type { IBoardTermRepository } from '../repositories/board-term.repository';
import type { ICommitteeRepository } from '../repositories/committee.repository';

export interface CreateCommitteeInput {
  gestaoId: string;
  nome: string;
  descricao: string | null;
  membrosIds: string[];
}

export interface CreateCommitteeDeps {
  committeeRepository: ICommitteeRepository;
  boardTermRepository: IBoardTermRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export class CreateCommitteeUseCase {
  constructor(private readonly deps: CreateCommitteeDeps) {}

  async execute(ctx: AuthContext, input: CreateCommitteeInput): Promise<Result<Committee>> {
    requirePermission(ctx, 'committee:manage');

    const term = await this.deps.boardTermRepository.findById(input.gestaoId);
    if (!term || term.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('BoardTerm', input.gestaoId));
    }

    const now = this.deps.clock.now();
    const committee: Committee = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      gestaoId: input.gestaoId,
      nome: input.nome,
      descricao: input.descricao,
      membrosIds: input.membrosIds,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.committeeRepository.create(committee);

    return ok(committee);
  }
}
