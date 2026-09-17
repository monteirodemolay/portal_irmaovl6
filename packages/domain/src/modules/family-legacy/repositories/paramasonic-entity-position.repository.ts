import type { ParamasonicEntityPosition } from '../entities/paramasonic-entity-position.entity';

export interface IParamasonicEntityPositionRepository {
  findById(id: string): Promise<ParamasonicEntityPosition | null>;
  /** Cargos cadastrados de uma entidade (não excluídos) — base do seletor de cargo em "Adicionar integrante". */
  listByEntity(tenantId: string, entityId: string): Promise<ParamasonicEntityPosition[]>;
  create(position: ParamasonicEntityPosition): Promise<void>;
  softDelete(id: string, deletedAt: Date, updatedBy: string): Promise<void>;
}
