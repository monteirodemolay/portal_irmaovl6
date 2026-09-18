import type { FraternalAffiliationKind, ParamasonicEntityStatus } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { err, NotFoundError, ValidationError, ok, type Result } from '../../../shared/result';
import type {
  ParamasonicEntity,
  ParamasonicEntityModules,
} from '../entities/paramasonic-entity.entity';
import type { IParamasonicEntityRepository } from '../repositories/paramasonic-entity.repository';

export interface UpdateParamasonicEntityInput {
  kind: Exclude<FraternalAffiliationKind, 'mason'>;
  name: string;
  shortName: string;
  unitNumber: string | null;
  parentUnitName: string;
  situacao: ParamasonicEntityStatus;
  modules: ParamasonicEntityModules;
}

export interface UpdateParamasonicEntityDeps {
  paramasonicEntityRepository: IParamasonicEntityRepository;
  clock: IClock;
}

/** Edita os dados institucionais de uma entidade paramaçônica já cadastrada. */
export class UpdateParamasonicEntityUseCase {
  constructor(private readonly deps: UpdateParamasonicEntityDeps) {}

  async execute(
    ctx: AuthContext,
    entityId: string,
    input: UpdateParamasonicEntityInput,
  ): Promise<Result<ParamasonicEntity>> {
    requirePermission(ctx, 'paramasonicEntity:manage');

    const existing = await this.deps.paramasonicEntityRepository.findById(entityId);
    if (!existing || existing.tenantId !== ctx.tenantId || existing.deletedAt) {
      return err(new NotFoundError('ParamasonicEntity', entityId));
    }

    const name = input.name.trim();
    const shortName = input.shortName.trim();
    if (!name) {
      return err(new ValidationError('Nome oficial da entidade é obrigatório.'));
    }
    if (!shortName) {
      return err(new ValidationError('Nome curto da entidade é obrigatório.'));
    }
    if (!input.parentUnitName.trim()) {
      return err(new ValidationError('Entidade responsável é obrigatória.'));
    }

    const updated: ParamasonicEntity = {
      ...existing,
      kind: input.kind,
      name,
      shortName,
      unitNumber: input.unitNumber?.trim() || null,
      parentUnitName: input.parentUnitName.trim(),
      situacao: input.situacao,
      modules: input.modules,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };

    await this.deps.paramasonicEntityRepository.update(updated);
    return ok(updated);
  }
}
