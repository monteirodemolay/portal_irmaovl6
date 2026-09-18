import type { FraternalAffiliationKind, ParamasonicEntityStatus } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { err, ValidationError, ok, type Result } from '../../../shared/result';
import type {
  ParamasonicEntity,
  ParamasonicEntityModules,
} from '../entities/paramasonic-entity.entity';
import type { IParamasonicEntityRepository } from '../repositories/paramasonic-entity.repository';

export interface CreateParamasonicEntityInput {
  kind: Exclude<FraternalAffiliationKind, 'mason'>;
  name: string;
  shortName: string;
  unitNumber: string | null;
  parentUnitName: string;
  situacao: ParamasonicEntityStatus;
  modules: ParamasonicEntityModules;
}

export interface CreateParamasonicEntityDeps {
  paramasonicEntityRepository: IParamasonicEntityRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Cadastra uma nova organização paramaçônica com página própria (Fase 1 —
 * ver `ParamasonicEntity`). Nasce isolada: sem integrantes, sem gestores
 * além da Administração da Loja — as fases seguintes ligam Integrantes,
 * Diretoria, Agenda e Avisos/Acervo.
 */
export class CreateParamasonicEntityUseCase {
  constructor(private readonly deps: CreateParamasonicEntityDeps) {}

  async execute(
    ctx: AuthContext,
    input: CreateParamasonicEntityInput,
  ): Promise<Result<ParamasonicEntity>> {
    requirePermission(ctx, 'paramasonicEntity:manage');

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

    const now = this.deps.clock.now();
    const entity: ParamasonicEntity = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      kind: input.kind,
      name,
      shortName,
      unitNumber: input.unitNumber?.trim() || null,
      parentUnitName: input.parentUnitName.trim(),
      situacao: input.situacao,
      crestUrl: null,
      logoUrl: null,
      modules: input.modules,
      managerUserIds: [],
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };

    await this.deps.paramasonicEntityRepository.create(entity);
    return ok(entity);
  }
}
