import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ValidationError, ok, err, type Result } from '../../../shared/result';
import type { PublicationSettings } from '../entities/publication-settings.entity';
import type { IPublicationSettingsRepository } from '../repositories/publication-settings.repository';

export interface SuspendCentralProfileDeps {
  publicationSettingsRepository: IPublicationSettingsRepository;
  clock: IClock;
}

/**
 * Moderação administrativa — congela a exibição sem apagar a configuração
 * do titular (reverter não exige reconfigurar nada). Nunca mexe em
 * `profilePublished`/`blocks`/`contacts`/`externalLinks` — essa fronteira é
 * reforçada de novo na Security Rule (defesa em profundidade real, não
 * decorativa). Motivo é obrigatório: fica registrado quem, quando e por quê
 * (requisito de auditoria da Central).
 */
export class SuspendCentralProfileUseCase {
  constructor(private readonly deps: SuspendCentralProfileDeps) {}

  async execute(
    ctx: AuthContext,
    memberId: string,
    motivo: string,
  ): Promise<Result<PublicationSettings>> {
    requirePermission(ctx, 'memberCentral:manage');

    if (!motivo.trim()) {
      return err(new ValidationError('Motivo da suspensão é obrigatório.'));
    }

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
      suspendedAt: now,
      suspendedBy: ctx.uid,
      suspendedReason: motivo.trim(),
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.publicationSettingsRepository.update(updated);

    return ok(updated);
  }
}
