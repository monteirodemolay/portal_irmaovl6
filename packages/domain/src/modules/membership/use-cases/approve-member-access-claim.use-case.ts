import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Member } from '../entities/member.entity';
import type { MemberAccessClaim } from '../entities/member-access-claim.entity';
import type { IMemberRepository } from '../repositories/member.repository';
import type { IMemberAccessClaimRepository } from '../repositories/member-access-claim.repository';

export interface ApproveMemberAccessClaimDeps {
  memberAccessClaimRepository: IMemberAccessClaimRepository;
  memberRepository: IMemberRepository;
  clock: IClock;
}

export interface ApproveMemberAccessClaimOutput {
  claim: MemberAccessClaim;
  member: Member;
}

/**
 * Aprova a solicitação — só marca `revisaoStatus`/`revisadoPor`/`revisadoEm`
 * aqui. A criação da conta Firebase Auth/`User` e o vínculo
 * `Member.userId` continuam na Server Action (mesma divisão de
 * responsabilidade que o antigo `ClaimMemberAccountUseCase` já usava,
 * `createPortalAccessForMember`): infraestrutura fora do domínio.
 */
export class ApproveMemberAccessClaimUseCase {
  constructor(private readonly deps: ApproveMemberAccessClaimDeps) {}

  async execute(
    ctx: AuthContext,
    claimId: string,
  ): Promise<Result<ApproveMemberAccessClaimOutput>> {
    requirePermission(ctx, 'member:manage');

    const claim = await this.deps.memberAccessClaimRepository.findById(claimId);
    if (!claim || claim.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('MemberAccessClaim', claimId));
    }
    if (claim.revisaoStatus !== 'pendente') {
      return err(new ConflictError('Esta solicitação já foi revisada.'));
    }

    const member = await this.deps.memberRepository.findById(claim.memberId);
    if (!member || member.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Member', claim.memberId));
    }
    if (member.userId) {
      return err(new ConflictError('Este cadastro já tem um acesso vinculado.'));
    }

    const now = this.deps.clock.now();
    const updated: MemberAccessClaim = {
      ...claim,
      revisaoStatus: 'aprovada',
      revisadoPor: ctx.uid,
      revisadoEm: now,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.memberAccessClaimRepository.update(updated);

    return ok({ claim: updated, member });
  }
}
