import type { ArchiveRelationFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { ArchiveRelation } from '../entities/archive-relation.entity';
import type { IArchiveRelationRepository } from '../repositories/archive-relation.repository';

export interface CreateArchiveRelationDeps {
  archiveRelationRepository: IArchiveRelationRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Cria uma aresta da Constelação da Memória entre dois nós já existentes no
 * domínio — nunca copia o registro de origem/destino, só guarda os dois IDs
 * canônicos e o tipo de relação.
 */
export class CreateArchiveRelationUseCase {
  constructor(private readonly deps: CreateArchiveRelationDeps) {}

  async execute(
    ctx: AuthContext,
    input: ArchiveRelationFormValues,
  ): Promise<Result<ArchiveRelation>> {
    requirePermission(ctx, 'archiveRelation:create');

    const now = this.deps.clock.now();
    const relation: ArchiveRelation = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ...input,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.archiveRelationRepository.create(relation);

    return ok(relation);
  }
}
