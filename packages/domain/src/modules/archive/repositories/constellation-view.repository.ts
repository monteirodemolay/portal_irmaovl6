import type { ConstellationView } from '../entities/constellation-view.entity';

export interface IConstellationViewRepository {
  findById(id: string): Promise<ConstellationView | null>;
  /** Só filtros de igualdade — sem `orderBy`, não exige índice composto novo. */
  listByOwner(tenantId: string, ownerId: string): Promise<ConstellationView[]>;
  create(view: ConstellationView): Promise<void>;
  /** Também usado para soft delete (`deletedAt`/`status`/`ativo`) — segue o contrato padrão de `BaseEntity`. */
  update(view: ConstellationView): Promise<void>;
}
