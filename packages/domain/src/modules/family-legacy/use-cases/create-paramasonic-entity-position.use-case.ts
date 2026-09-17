import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { err, NotFoundError, ValidationError, ok, type Result } from '../../../shared/result';
import type { ParamasonicEntityPosition } from '../entities/paramasonic-entity-position.entity';
import type { IParamasonicEntityPositionRepository } from '../repositories/paramasonic-entity-position.repository';
import type { IParamasonicEntityRepository } from '../repositories/paramasonic-entity.repository';

export interface CreateParamasonicEntityPositionDeps {
  paramasonicEntityPositionRepository: IParamasonicEntityPositionRepository;
  paramasonicEntityRepository: IParamasonicEntityRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Cadastra um cargo institucional de uma entidade paramaçônica — vai
 * formando, aos poucos, o quadro fixo de cargos dela (ver
 * `ParamasonicEntityPosition`).
 */
export class CreateParamasonicEntityPositionUseCase {
  constructor(private readonly deps: CreateParamasonicEntityPositionDeps) {}

  async execute(
    ctx: AuthContext,
    entityId: string,
    nome: string,
  ): Promise<Result<ParamasonicEntityPosition>> {
    requirePermission(ctx, 'paramasonicEntity:manage');

    const entity = await this.deps.paramasonicEntityRepository.findById(entityId);
    if (!entity || entity.tenantId !== ctx.tenantId || entity.deletedAt) {
      return err(new NotFoundError('ParamasonicEntity', entityId));
    }

    const nomeTrimmed = nome.trim();
    if (!nomeTrimmed) {
      return err(new ValidationError('Nome do cargo é obrigatório.'));
    }

    const existing = await this.deps.paramasonicEntityPositionRepository.listByEntity(
      ctx.tenantId,
      entityId,
    );
    if (existing.some((p) => p.nome.toLowerCase() === nomeTrimmed.toLowerCase())) {
      return err(new ValidationError('Este cargo já está cadastrado para esta entidade.'));
    }

    const now = this.deps.clock.now();
    const position: ParamasonicEntityPosition = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      entityId,
      nome: nomeTrimmed,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };

    await this.deps.paramasonicEntityPositionRepository.create(position);
    return ok(position);
  }
}
