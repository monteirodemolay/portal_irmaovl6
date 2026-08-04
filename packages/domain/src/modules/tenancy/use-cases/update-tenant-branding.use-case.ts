import type { TenantBrandingInput } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { TenantBranding } from '../entities/tenant-branding.entity';
import type { ITenantBrandingRepository } from '../repositories/tenant-branding.repository';

export interface UpdateTenantBrandingDeps {
  brandingRepository: ITenantBrandingRepository;
  clock: IClock;
}

/**
 * Altera a identidade visual da Loja. Requer `branding:manage`. É o único
 * caminho legítimo para mudar cores/logotipo/raio de borda — nunca uma
 * alteração de código (docs/architecture/09-design-system.md).
 */
export class UpdateTenantBrandingUseCase {
  constructor(private readonly deps: UpdateTenantBrandingDeps) {}

  async execute(
    ctx: AuthContext,
    patch: Partial<TenantBrandingInput>,
  ): Promise<Result<TenantBranding>> {
    requirePermission(ctx, 'branding:manage');

    const current = await this.deps.brandingRepository.findByTenantId(ctx.tenantId);
    if (!current) {
      return err(new NotFoundError('TenantBranding', ctx.tenantId));
    }

    const updated: TenantBranding = {
      ...current,
      ...patch,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.brandingRepository.update(updated);

    return ok(updated);
  }
}
