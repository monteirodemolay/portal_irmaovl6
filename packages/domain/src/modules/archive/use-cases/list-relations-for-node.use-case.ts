import type { ArchiveRelationNodeKind } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ArchiveRelation } from '../entities/archive-relation.entity';
import type { IArchiveRelationRepository } from '../repositories/archive-relation.repository';

export interface ListRelationsForNodeDeps {
  archiveRelationRepository: IArchiveRelationRepository;
}

/**
 * Relações diretas de um nó (item, pessoa, gestão, evento ou coleção) — a
 * Constelação da Memória local exibida em cada página do Estágio 5 (e a
 * lista textual completa que sempre acompanha o grafo).
 */
export class ListRelationsForNodeUseCase {
  constructor(private readonly deps: ListRelationsForNodeDeps) {}

  async execute(
    ctx: AuthContext,
    nodeTipo: ArchiveRelationNodeKind,
    nodeId: string,
  ): Promise<ArchiveRelation[]> {
    requirePermission(ctx, 'archiveRelation:read');
    return this.deps.archiveRelationRepository.listByNode(ctx.tenantId, nodeTipo, nodeId);
  }
}
