import type { FamilyPersonRefKind } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IFamilyRelationshipRepository } from '../repositories/family-relationship.repository';
import {
  deriveKinships,
  type DerivedKinship,
  type RelationshipEdge,
} from '../services/derive-kinships';

export interface DeriveFamilyKinshipsDeps {
  familyRelationshipRepository: IFamilyRelationshipRepository;
}

/**
 * Calcula o parentesco de todas as pessoas alcançáveis a partir de `owner`
 * (avô, bisavô, tio, sogro etc.) — carrega a rede inteira do tenant porque a
 * cadeia pode passar por pessoas que não têm nenhuma aresta direta com
 * `owner`. Requer `familyLegacy:read`: é uma leitura geral, não uma ação
 * pessoal (diferente dos casos de uso de escrita deste módulo).
 */
export class DeriveFamilyKinshipsUseCase {
  constructor(private readonly deps: DeriveFamilyKinshipsDeps) {}

  async execute(
    ctx: AuthContext,
    owner: { kind: FamilyPersonRefKind; id: string },
    maxDepth?: number,
  ): Promise<DerivedKinship[]> {
    requirePermission(ctx, 'familyLegacy:read');

    const relations = await this.deps.familyRelationshipRepository.listByTenant(ctx.tenantId);
    const edges: RelationshipEdge[] = relations
      .filter((relation) => !relation.deletedAt)
      .map((relation) => ({
        id: relation.id,
        from: { kind: relation.fromKind, id: relation.fromId },
        to: { kind: relation.toKind, id: relation.toId },
        relationKind: relation.relationKind,
        parentRole: relation.parentRole,
        childRole: relation.childRole,
      }));

    return deriveKinships(owner, edges, maxDepth);
  }
}
