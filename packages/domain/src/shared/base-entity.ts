import type { EntityStatus } from '@vl6/shared';

/**
 * Campos obrigatórios de toda entidade persistida — ver
 * docs/architecture/03-modelo-dados.md §3.1. Nenhum repositório expõe delete
 * físico: "excluir" sempre significa `deletedAt != null` (soft delete).
 */
export interface BaseEntity {
  readonly id: string;
  readonly tenantId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly createdBy: string;
  readonly updatedBy: string;
  readonly deletedAt: Date | null;
  readonly status: EntityStatus;
  readonly ativo: boolean;
}

export type NewEntity<T extends BaseEntity> = Omit<
  T,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'status' | 'ativo'
> & {
  status?: EntityStatus;
};

export function isDeleted(entity: Pick<BaseEntity, 'deletedAt'>): boolean {
  return entity.deletedAt !== null;
}
