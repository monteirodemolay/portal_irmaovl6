import type { ParamasonicEntity } from '../entities/paramasonic-entity.entity';

export interface IParamasonicEntityRepository {
  findById(id: string): Promise<ParamasonicEntity | null>;
  /** Todas as entidades do tenant (não excluídas) — base da grade de cards. */
  listByTenant(tenantId: string): Promise<ParamasonicEntity[]>;
  create(entity: ParamasonicEntity): Promise<void>;
  update(entity: ParamasonicEntity): Promise<void>;
  softDelete(id: string, deletedAt: Date, updatedBy: string): Promise<void>;
}
