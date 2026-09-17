import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ParamasonicEntityPosition } from '../entities/paramasonic-entity-position.entity';
import type { IParamasonicEntityPositionRepository } from '../repositories/paramasonic-entity-position.repository';

export interface ListParamasonicEntityPositionsDeps {
  paramasonicEntityPositionRepository: IParamasonicEntityPositionRepository;
}

/** Lista os cargos cadastrados de uma entidade, em ordem alfabética. */
export class ListParamasonicEntityPositionsUseCase {
  constructor(private readonly deps: ListParamasonicEntityPositionsDeps) {}

  async execute(ctx: AuthContext, entityId: string): Promise<ParamasonicEntityPosition[]> {
    requirePermission(ctx, 'paramasonicEntity:read');

    const positions = await this.deps.paramasonicEntityPositionRepository.listByEntity(
      ctx.tenantId,
      entityId,
    );
    return positions.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
}
