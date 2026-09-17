import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { err, NotFoundError, ok, type Result } from '../../../shared/result';
import type { IParamasonicEntityMemberRepository } from '../repositories/paramasonic-entity-member.repository';

export interface RemoveParamasonicEntityMemberDeps {
  paramasonicEntityMemberRepository: IParamasonicEntityMemberRepository;
  clock: IClock;
}

/** Remove (soft delete) um integrante cadastrado por engano — nunca exclusão física. */
export class RemoveParamasonicEntityMemberUseCase {
  constructor(private readonly deps: RemoveParamasonicEntityMemberDeps) {}

  async execute(ctx: AuthContext, memberEntryId: string): Promise<Result<null>> {
    requirePermission(ctx, 'paramasonicEntity:manage');

    const existing = await this.deps.paramasonicEntityMemberRepository.findById(memberEntryId);
    if (!existing || existing.tenantId !== ctx.tenantId || existing.deletedAt) {
      return err(new NotFoundError('ParamasonicEntityMember', memberEntryId));
    }

    await this.deps.paramasonicEntityMemberRepository.softDelete(
      memberEntryId,
      this.deps.clock.now(),
      ctx.uid,
    );
    return ok(null);
  }
}
