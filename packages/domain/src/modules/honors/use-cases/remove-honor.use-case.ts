import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { err, NotFoundError, ok, type Result } from '../../../shared/result';
import type { IHonorRepository } from '../repositories/honor.repository';

export interface RemoveHonorDeps {
  honorRepository: IHonorRepository;
  clock: IClock;
}

/** Remove (soft delete) uma Honraria cadastrada por engano — nunca exclusão física. */
export class RemoveHonorUseCase {
  constructor(private readonly deps: RemoveHonorDeps) {}

  async execute(ctx: AuthContext, honorId: string): Promise<Result<null>> {
    requirePermission(ctx, 'honor:manage');

    const honor = await this.deps.honorRepository.findById(honorId);
    if (!honor || honor.tenantId !== ctx.tenantId || honor.deletedAt) {
      return err(new NotFoundError('Honraria', honorId));
    }

    await this.deps.honorRepository.softDelete(honorId, this.deps.clock.now(), ctx.uid);
    return ok(null);
  }
}
