import type { UpdateComunidadeHeroFotoInput } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Tenant } from '../entities/tenant.entity';
import type { ITenantRepository } from '../repositories/tenant.repository';

export interface UpdateComunidadeHeroFotoDeps {
  tenantRepository: ITenantRepository;
  clock: IClock;
}

/**
 * Troca (ou remove, com `fotoUrl: null`) a fotografia de fundo da hero da
 * Comunidade VL6 (`/irmaos`). Requer `tenant:manage` — mesma permissão de
 * outras configurações institucionais da Loja (`UpdateTenantSettingsUseCase`),
 * nunca `branding:manage`: isto não é identidade visual (cores/logotipo),
 * é uma informação institucional da Loja física (o Templo).
 */
export class UpdateComunidadeHeroFotoUseCase {
  constructor(private readonly deps: UpdateComunidadeHeroFotoDeps) {}

  async execute(ctx: AuthContext, input: UpdateComunidadeHeroFotoInput): Promise<Result<Tenant>> {
    requirePermission(ctx, 'tenant:manage');

    const current = await this.deps.tenantRepository.findById(ctx.tenantId);
    if (!current) {
      return err(new NotFoundError('Tenant', ctx.tenantId));
    }

    const updated: Tenant = {
      ...current,
      comunidadeHeroFotoUrl: input.fotoUrl,
      // Sem foto, não faz sentido guardar enquadramento — mantém os dois
      // campos sempre coerentes entre si.
      comunidadeHeroFotoPosicao: input.fotoUrl ? input.posicao : null,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.tenantRepository.update(updated);

    return ok(updated);
  }
}
