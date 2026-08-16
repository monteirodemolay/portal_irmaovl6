import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IArchiveRelationRepository } from '../repositories/archive-relation.repository';

export interface SoftDeleteArchiveRelationDeps {
  archiveRelationRepository: IArchiveRelationRepository;
  clock: IClock;
}

export class SoftDeleteArchiveRelationUseCase {
  constructor(private readonly deps: SoftDeleteArchiveRelationDeps) {}

  async execute(ctx: AuthContext, relationId: string): Promise<Result<void>> {
    requirePermission(ctx, 'archiveRelation:delete');

    const relation = await this.deps.archiveRelationRepository.findById(relationId);
    if (!relation || relation.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveRelation', relationId));
    }

    const now = this.deps.clock.now();
    await this.deps.archiveRelationRepository.update({
      ...relation,
      deletedAt: now,
      status: 'archived',
      ativo: false,
      updatedAt: now,
      updatedBy: ctx.uid,
    });

    return ok(undefined);
  }
}
