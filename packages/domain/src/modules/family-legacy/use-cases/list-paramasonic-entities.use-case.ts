import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ParamasonicEntity } from '../entities/paramasonic-entity.entity';
import type { IParamasonicEntityRepository } from '../repositories/paramasonic-entity.repository';

export interface ListParamasonicEntitiesDeps {
  paramasonicEntityRepository: IParamasonicEntityRepository;
}

/** Lista as entidades paramaçônicas do tenant, ordenadas por nome — base da grade de cards. */
export class ListParamasonicEntitiesUseCase {
  constructor(private readonly deps: ListParamasonicEntitiesDeps) {}

  async execute(ctx: AuthContext): Promise<ParamasonicEntity[]> {
    requirePermission(ctx, 'paramasonicEntity:read');

    const entities = await this.deps.paramasonicEntityRepository.listByTenant(ctx.tenantId);
    return entities.sort((a, b) => a.shortName.localeCompare(b.shortName, 'pt-BR'));
  }
}
