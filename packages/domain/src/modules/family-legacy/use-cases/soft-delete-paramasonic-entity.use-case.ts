import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { err, NotFoundError, ok, type Result } from '../../../shared/result';
import type { IParamasonicEntityRepository } from '../repositories/paramasonic-entity.repository';

export interface SoftDeleteParamasonicEntityDeps {
  paramasonicEntityRepository: IParamasonicEntityRepository;
  clock: IClock;
}

/** Remove (soft delete) uma entidade paramaçônica cadastrada por engano — nunca exclusão física. */
export class SoftDeleteParamasonicEntityUseCase {
  constructor(private readonly deps: SoftDeleteParamasonicEntityDeps) {}

  async execute(ctx: AuthContext, entityId: string): Promise<Result<null>> {
    requirePermission(ctx, 'paramasonicEntity:manage');

    const existing = await this.deps.paramasonicEntityRepository.findById(entityId);
    if (!existing || existing.tenantId !== ctx.tenantId || existing.deletedAt) {
      return err(new NotFoundError('ParamasonicEntity', entityId));
    }

    await this.deps.paramasonicEntityRepository.softDelete(
      entityId,
      this.deps.clock.now(),
      ctx.uid,
    );
    return ok(null);
  }
}
