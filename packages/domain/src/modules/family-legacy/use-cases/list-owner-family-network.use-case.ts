import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { FamilyPerson } from '../entities/family-person.entity';
import type { FamilyRelationship } from '../entities/family-relationship.entity';
import type { IFamilyPersonRepository } from '../repositories/family-person.repository';
import type { IFamilyRelationshipRepository } from '../repositories/family-relationship.repository';
import { deriveKinships, type DerivedKinship } from '../services/derive-kinships';

export interface ListOwnerFamilyNetworkDeps {
  familyRelationshipRepository: IFamilyRelationshipRepository;
  familyPersonRepository: IFamilyPersonRepository;
}

export interface OwnerFamilyNetwork {
  relationships: FamilyRelationship[];
  derivedKinships: DerivedKinship[];
  /** `FamilyPerson`s referenciados por qualquer parentesco derivado — para a Server Action montar o DTO sem round-trips extras. */
  referencedFamilyPersons: FamilyPerson[];
}

/**
 * Visão "própria" da rede familiar de um Irmão — fonte de dados do
 * `FamilyLegacyCard` em modo lista (04_TELAS_E_FLUXOS.md §1). Requer
 * `familyLegacy:read`; a filtragem por dono acontece pela cadeia de
 * parentesco a partir de `ownerMemberId`, nunca lendo "todo mundo e
 * escondendo com CSS".
 */
export class ListOwnerFamilyNetworkUseCase {
  constructor(private readonly deps: ListOwnerFamilyNetworkDeps) {}

  async execute(ctx: AuthContext, ownerMemberId: string): Promise<OwnerFamilyNetwork> {
    requirePermission(ctx, 'familyLegacy:read');

    const allRelations = await this.deps.familyRelationshipRepository.listByTenant(ctx.tenantId);
    const activeRelations = allRelations.filter((relation) => !relation.deletedAt);

    const owner = { kind: 'member' as const, id: ownerMemberId };
    const edges = activeRelations.map((relation) => ({
      id: relation.id,
      from: { kind: relation.fromKind, id: relation.fromId },
      to: { kind: relation.toKind, id: relation.toId },
      relationKind: relation.relationKind,
      parentRole: relation.parentRole,
      childRole: relation.childRole,
    }));
    const derivedKinships = deriveKinships(owner, edges);

    const relevantRelationshipIds = new Set(derivedKinships.flatMap((k) => k.pathRelationshipIds));
    const relationships = activeRelations.filter((relation) =>
      relevantRelationshipIds.has(relation.id),
    );

    const familyPersonIds = [
      ...new Set(
        derivedKinships.filter((k) => k.person.kind === 'familyPerson').map((k) => k.person.id),
      ),
    ];
    const referencedFamilyPersons =
      familyPersonIds.length > 0
        ? await this.deps.familyPersonRepository.listByIds(ctx.tenantId, familyPersonIds)
        : [];

    return { relationships, derivedKinships, referencedFamilyPersons };
  }
}
