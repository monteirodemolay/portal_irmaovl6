import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import {
  ConflictError,
  NotFoundError,
  ValidationError,
  ok,
  err,
  type Result,
} from '../../../shared/result';
import type { MemberAccessClaim } from '../entities/member-access-claim.entity';
import type { IMemberAccessClaimRepository } from '../repositories/member-access-claim.repository';

export interface RejectMemberAccessClaimDeps {
  memberAccessClaimRepository: IMemberAccessClaimRepository;
  clock: IClock;
}

/**
 * Rejeita a solicitação — nunca soft-deleta (mesmo espírito de
 * `ModerateArchiveContributionUseCase`): o motivo fica registrado, e nada
 * impede o Irmão de solicitar de novo depois (`Member.userId` continua
 * `null`, `SubmitMemberAccessClaimUseCase` só bloqueia duplicidade
 * enquanto a solicitação anterior está `pendente`).
 */
export class RejectMemberAccessClaimUseCase {
  constructor(private readonly deps: RejectMemberAccessClaimDeps) {}

  async execute(
    ctx: AuthContext,
    claimId: string,
    motivoRejeicao: string,
  ): Promise<Result<MemberAccessClaim>> {
    requirePermission(ctx, 'member:manage');

    if (!motivoRejeicao.trim()) {
      return err(new ValidationError('Informe o motivo da rejeição.'));
    }

    const claim = await this.deps.memberAccessClaimRepository.findById(claimId);
    if (!claim || claim.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('MemberAccessClaim', claimId));
    }
    if (claim.revisaoStatus !== 'pendente') {
      return err(new ConflictError('Esta solicitação já foi revisada.'));
    }

    const now = this.deps.clock.now();
    const updated: MemberAccessClaim = {
      ...claim,
      revisaoStatus: 'rejeitada',
      motivoRejeicao: motivoRejeicao.trim(),
      revisadoPor: ctx.uid,
      revisadoEm: now,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.memberAccessClaimRepository.update(updated);

    return ok(updated);
  }
}
