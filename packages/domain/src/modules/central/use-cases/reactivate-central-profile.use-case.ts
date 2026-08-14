import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { PublicationSettings } from '../entities/publication-settings.entity';
import type { IPublicationSettingsRepository } from '../repositories/publication-settings.repository';

export interface ReactivateCentralProfileDeps {
  publicationSettingsRepository: IPublicationSettingsRepository;
  clock: IClock;
}

/** Reverte uma suspensão administrativa — nunca liga um bloco que o titular não tinha ligado. */
export class ReactivateCentralProfileUseCase {
  constructor(private readonly deps: ReactivateCentralProfileDeps) {}

  async execute(ctx: AuthContext, memberId: string): Promise<Result<PublicationSettings>> {
    requirePermission(ctx, 'memberCentral:manage');

    const settings = await this.deps.publicationSettingsRepository.findByMemberId(
      ctx.tenantId,
      memberId,
    );
    if (!settings) {
      return err(new NotFoundError('PublicationSettings', memberId));
    }

    const now = this.deps.clock.now();
    const updated: PublicationSettings = {
      ...settings,
      suspendedAt: null,
      suspendedBy: null,
      suspendedReason: null,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.publicationSettingsRepository.update(updated);

    return ok(updated);
  }
}
