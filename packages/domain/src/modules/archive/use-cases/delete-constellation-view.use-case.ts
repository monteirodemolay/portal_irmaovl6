import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ForbiddenError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IConstellationViewRepository } from '../repositories/constellation-view.repository';

export interface DeleteConstellationViewDeps {
  constellationViewRepository: IConstellationViewRepository;
  clock: IClock;
}

/** Soft delete — só o dono pode. */
export class DeleteConstellationViewUseCase {
  constructor(private readonly deps: DeleteConstellationViewDeps) {}

  async execute(ctx: AuthContext, viewId: string): Promise<Result<void>> {
    requirePermission(ctx, 'archiveRelation:read');

    const current = await this.deps.constellationViewRepository.findById(viewId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ConstellationView', viewId));
    }
    if (current.ownerId !== ctx.uid) {
      return err(new ForbiddenError('dono do quadro'));
    }

    const now = this.deps.clock.now();
    await this.deps.constellationViewRepository.update({
      ...current,
      deletedAt: now,
      status: 'inactive',
      ativo: false,
      updatedAt: now,
      updatedBy: ctx.uid,
    });

    return ok(undefined);
  }
}
