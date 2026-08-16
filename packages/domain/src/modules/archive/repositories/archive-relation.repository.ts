import type { ArchiveRelationNodeKind } from '@vl6/shared';
import type { ArchiveRelation } from '../entities/archive-relation.entity';

export interface IArchiveRelationRepository {
  findById(id: string): Promise<ArchiveRelation | null>;
  listByTenant(tenantId: string): Promise<ArchiveRelation[]>;
  /** Relações em que o nó aparece como origem OU destino, mescladas e sem duplicatas. */
  listByNode(
    tenantId: string,
    nodeTipo: ArchiveRelationNodeKind,
    nodeId: string,
  ): Promise<ArchiveRelation[]>;
  create(relation: ArchiveRelation): Promise<void>;
  update(relation: ArchiveRelation): Promise<void>;
}
