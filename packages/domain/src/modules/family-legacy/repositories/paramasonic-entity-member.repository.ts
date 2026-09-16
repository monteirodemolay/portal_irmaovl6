import type { ParamasonicEntityMember } from '../entities/paramasonic-entity-member.entity';

export interface IParamasonicEntityMemberRepository {
  findById(id: string): Promise<ParamasonicEntityMember | null>;
  /** Integrantes de uma entidade (não excluídos) — base da aba "Integrantes". */
  listByEntity(tenantId: string, entityId: string): Promise<ParamasonicEntityMember[]>;
  create(entity: ParamasonicEntityMember): Promise<void>;
  softDelete(id: string, deletedAt: Date, updatedBy: string): Promise<void>;
}
