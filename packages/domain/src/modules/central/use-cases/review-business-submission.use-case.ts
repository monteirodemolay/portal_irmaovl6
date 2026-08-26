import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';
import type { IMemberCentralProfileRepository } from '../repositories/member-central-profile.repository';

export interface ReviewBusinessSubmissionDeps {
  memberCentralProfileRepository: IMemberCentralProfileRepository;
  clock: IClock;
}

export type BusinessReviewDecision = 'approve' | 'reject' | 'suspend';

/**
 * Decisão administrativa sobre um negócio — `approve` (→ `published`),
 * `reject` (→ `draft`: o Irmão revisa e reenvia, nunca fica travado) ou
 * `suspend` (→ `suspended`: puxa de volta um que já estava publicado,
 * distinto de `reject` porque não é sobre o conteúdo estar errado, é uma
 * decisão de moderação sobre algo já aprovado antes). O Irmão nunca decide
 * `published`/`suspended` sozinho — só a Administração, mesmo espírito de
 * `SuspendCentralProfileUseCase`.
 */
export class ReviewBusinessSubmissionUseCase {
  constructor(private readonly deps: ReviewBusinessSubmissionDeps) {}

  async execute(
    ctx: AuthContext,
    memberId: string,
    businessId: string,
    decision: BusinessReviewDecision,
  ): Promise<Result<MemberCentralProfile>> {
    requirePermission(ctx, 'memberCentral:manage');

    const profile = await this.deps.memberCentralProfileRepository.findByMemberId(
      ctx.tenantId,
      memberId,
    );
    if (!profile) {
      return err(new NotFoundError('MemberCentralProfile', memberId));
    }

    const entry = profile.negocios.find((n) => n.id === businessId);
    if (!entry) {
      return err(new NotFoundError('CentralBusinessEntry', businessId));
    }

    const status =
      decision === 'approve' ? 'published' : decision === 'reject' ? 'draft' : 'suspended';
    const now = this.deps.clock.now();
    const updated: MemberCentralProfile = {
      ...profile,
      negocios: profile.negocios.map((n) =>
        n.id === businessId ? { ...n, status, updatedAt: now } : n,
      ),
      updatedAt: now,
      updatedBy: ctx.uid,
    };

    await this.deps.memberCentralProfileRepository.update(updated);
    return ok(updated);
  }
}
