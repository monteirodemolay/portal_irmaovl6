import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { err, NotFoundError, ok, type Result } from '../../../shared/result';
import type { IParamasonicEntityPositionRepository } from '../repositories/paramasonic-entity-position.repository';

export interface RemoveParamasonicEntityPositionDeps {
  paramasonicEntityPositionRepository: IParamasonicEntityPositionRepository;
  clock: IClock;
}

/**
 * Remove (soft delete) um cargo cadastrado por engano — nunca exclusão
 * física. Não afeta integrantes já cadastrados com esse cargo (o campo
 * `cargo` de `ParamasonicEntityMember` é texto simples, não uma referência).
 */
export class RemoveParamasonicEntityPositionUseCase {
  constructor(private readonly deps: RemoveParamasonicEntityPositionDeps) {}

  async execute(ctx: AuthContext, positionId: string): Promise<Result<null>> {
    requirePermission(ctx, 'paramasonicEntity:manage');

    const existing = await this.deps.paramasonicEntityPositionRepository.findById(positionId);
    if (!existing || existing.tenantId !== ctx.tenantId || existing.deletedAt) {
      return err(new NotFoundError('ParamasonicEntityPosition', positionId));
    }

    await this.deps.paramasonicEntityPositionRepository.softDelete(
      positionId,
      this.deps.clock.now(),
      ctx.uid,
    );
    return ok(null);
  }
}
