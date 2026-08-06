import type { UpdateTenantSettingsInput } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { TenantSettings } from '../entities/tenant-settings.entity';
import type { ITenantSettingsRepository } from '../repositories/tenant-settings.repository';

export interface UpdateTenantSettingsDeps {
  settingsRepository: ITenantSettingsRepository;
  clock: IClock;
}

/**
 * Altera a configuração comportamental da Loja (hoje: só `idiomaPadrao` —
 * docs/architecture/07-fluxo-autenticacao.md §7.9). Requer `tenant:manage`,
 * a mesma permissão de outras configurações gerais da Loja.
 */
export class UpdateTenantSettingsUseCase {
  constructor(private readonly deps: UpdateTenantSettingsDeps) {}

  async execute(
    ctx: AuthContext,
    patch: Partial<UpdateTenantSettingsInput>,
  ): Promise<Result<TenantSettings>> {
    requirePermission(ctx, 'tenant:manage');

    const current = await this.deps.settingsRepository.findByTenantId(ctx.tenantId);
    if (!current) {
      return err(new NotFoundError('TenantSettings', ctx.tenantId));
    }

    const updated: TenantSettings = {
      ...current,
      ...patch,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.settingsRepository.update(updated);

    return ok(updated);
  }
}
