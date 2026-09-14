import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { err, NotFoundError, ok, type Result } from '../../../shared/result';
import type { IMemberTitleRepository } from '../repositories/member-title.repository';

export interface RemoveMemberTitleDeps {
  memberTitleRepository: IMemberTitleRepository;
  clock: IClock;
}

/** Remove (soft delete) um Título/Condição cadastrado por engano — nunca exclusão física. */
export class RemoveMemberTitleUseCase {
  constructor(private readonly deps: RemoveMemberTitleDeps) {}

  async execute(ctx: AuthContext, titleId: string): Promise<Result<null>> {
    requirePermission(ctx, 'honor:manage');

    const title = await this.deps.memberTitleRepository.findById(titleId);
    if (!title || title.tenantId !== ctx.tenantId || title.deletedAt) {
      return err(new NotFoundError('Título', titleId));
    }

    await this.deps.memberTitleRepository.softDelete(titleId, this.deps.clock.now(), ctx.uid);
    return ok(null);
  }
}
