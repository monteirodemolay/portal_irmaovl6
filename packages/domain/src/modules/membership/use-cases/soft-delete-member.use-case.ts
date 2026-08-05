import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../repositories/member.repository';

export interface SoftDeleteMemberDeps {
  memberRepository: IMemberRepository;
  clock: IClock;
}

/**
 * Soft delete — nunca exclusão física (docs/architecture/03 §3.1 e
 * docs/architecture/06 §6.1: histórico de cargos/presenças permanece
 * intacto).
 */
export class SoftDeleteMemberUseCase {
  constructor(private readonly deps: SoftDeleteMemberDeps) {}

  async execute(ctx: AuthContext, memberId: string): Promise<Result<void>> {
    requirePermission(ctx, 'member:delete');

    const member = await this.deps.memberRepository.findById(memberId);
    if (!member || member.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Member', memberId));
    }

    const now = this.deps.clock.now();
    await this.deps.memberRepository.update({
      ...member,
      deletedAt: now,
      status: 'archived',
      ativo: false,
      updatedAt: now,
      updatedBy: ctx.uid,
    });

    return ok(undefined);
  }
}
