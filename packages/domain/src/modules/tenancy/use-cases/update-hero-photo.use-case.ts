import type { UpdateHeroPhotoInput } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Tenant } from '../entities/tenant.entity';
import type { ITenantRepository } from '../repositories/tenant.repository';

export interface UpdateHeroPhotoDeps {
  tenantRepository: ITenantRepository;
  clock: IClock;
}

/**
 * Troca (ou remove, com `fotoUrl: null`) a fotografia de fundo do `PageHero`
 * padronizado de uma página (`Tenant.heroPhotos[pageKey]`). Requer
 * `tenant:manage` — mesma permissão de outras configurações institucionais
 * da Loja, nunca `branding:manage`: isto não é identidade visual
 * (cores/logotipo), é conteúdo institucional (fotos do Templo, da Loja, dos
 * Irmãos) por página.
 */
export class UpdateHeroPhotoUseCase {
  constructor(private readonly deps: UpdateHeroPhotoDeps) {}

  async execute(ctx: AuthContext, input: UpdateHeroPhotoInput): Promise<Result<Tenant>> {
    requirePermission(ctx, 'tenant:manage');

    const current = await this.deps.tenantRepository.findById(ctx.tenantId);
    if (!current) {
      return err(new NotFoundError('Tenant', ctx.tenantId));
    }

    const heroPhotos = { ...current.heroPhotos };
    if (input.fotoUrl) {
      heroPhotos[input.pageKey] = { url: input.fotoUrl, posicao: input.posicao ?? 50 };
    } else {
      delete heroPhotos[input.pageKey];
    }

    const updated: Tenant = {
      ...current,
      heroPhotos,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.tenantRepository.update(updated);

    return ok(updated);
  }
}
