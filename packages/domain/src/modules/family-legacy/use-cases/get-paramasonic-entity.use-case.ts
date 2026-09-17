import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ParamasonicEntity } from '../entities/paramasonic-entity.entity';
import type { IParamasonicEntityRepository } from '../repositories/paramasonic-entity.repository';

export interface GetParamasonicEntityDeps {
  paramasonicEntityRepository: IParamasonicEntityRepository;
}

/** Busca uma entidade paramaçônica específica — base da página de detalhe (perfil da entidade). */
export class GetParamasonicEntityUseCase {
  constructor(private readonly deps: GetParamasonicEntityDeps) {}

  async execute(ctx: AuthContext, entityId: string): Promise<ParamasonicEntity | null> {
    requirePermission(ctx, 'paramasonicEntity:read');

    const entity = await this.deps.paramasonicEntityRepository.findById(entityId);
    if (!entity || entity.tenantId !== ctx.tenantId || entity.deletedAt) return null;
    return entity;
  }
}
