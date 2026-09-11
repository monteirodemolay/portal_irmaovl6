import type { FamilyVisibilityLevel } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IFamilyPersonRepository } from '../repositories/family-person.repository';
import type { IFamilyRelationshipRepository } from '../repositories/family-relationship.repository';
import { deriveKinships, type RelationshipEdge } from '../services/derive-kinships';

export interface SharedFamilyPersonMatch {
  familyPersonId: string;
  familyPersonNome: string;
  sharedWithMemberId: string;
  sharedWithNome: string;
  /** Como o titular chama essa pessoa (ex.: "Avô ou avó"). */
  parentescoDoTitular: string;
  /** Como o outro Irmão chama essa pessoa — `null` quando o vínculo dele não está aberto o bastante pra revelar (ver `PUBLIC_VISIBILITY_LEVELS`). */
  parentescoDoOutroIrmao: string | null;
}

export interface FindSharedFamilyPersonsDeps {
  familyRelationshipRepository: IFamilyRelationshipRepository;
  familyPersonRepository: IFamilyPersonRepository;
  memberRepository: IMemberRepository;
}

const PUBLIC_VISIBILITY_LEVELS: readonly FamilyVisibilityLevel[] = ['members', 'archive'];

/**
 * "Descoberta de parentesco cruzado" — pedido explícito: quando dois Irmãos
 * diferentes têm o MESMO `FamilyPerson` na árvore (ex.: o mesmo avô), nada
 * hoje avisa nenhum dos dois. Reaproveita `deriveKinships` duas vezes: uma
 * a partir do titular (pra achar os `FamilyPerson`s da árvore dele) e uma a
 * partir de CADA `FamilyPerson` compartilhado (pra achar todo Irmão
 * conectado a ele, com o rótulo do parentesco visto do lado da pessoa em
 * comum) — nunca reimplementa a travessia de grafo.
 *
 * O nome do outro Irmão é sempre institucional (nunca gated). O PARENTESCO
 * dele com a pessoa em comum só é revelado quando toda a cadeia que liga o
 * outro Irmão a ela está em visibilidade `'members'`/`'archive'` (mesmo
 * critério de `buildPublicFamiliaLegado`) — evita vazar o "lado" privado da
 * árvore de alguém só porque duas árvores se cruzam.
 */
export class FindSharedFamilyPersonsUseCase {
  constructor(private readonly deps: FindSharedFamilyPersonsDeps) {}

  async execute(
    ctx: AuthContext,
    ownerMemberId: string,
  ): Promise<Result<SharedFamilyPersonMatch[]>> {
    requirePermission(ctx, 'familyLegacy:read');

    const allRelations = await this.deps.familyRelationshipRepository.listByTenant(ctx.tenantId);
    const activeRelations = allRelations.filter((relation) => !relation.deletedAt);
    const relationshipById = new Map(activeRelations.map((r) => [r.id, r]));
    const edges: RelationshipEdge[] = activeRelations.map((relation) => ({
      id: relation.id,
      from: { kind: relation.fromKind, id: relation.fromId },
      to: { kind: relation.toKind, id: relation.toId },
      relationKind: relation.relationKind,
      parentRole: relation.parentRole,
      childRole: relation.childRole,
    }));

    const ownerKinships = deriveKinships({ kind: 'member', id: ownerMemberId }, edges);
    const ownerFamilyPersons = ownerKinships.filter((k) => k.person.kind === 'familyPerson');
    if (ownerFamilyPersons.length === 0) return ok([]);

    const matches: SharedFamilyPersonMatch[] = [];
    const memberIdsToResolve = new Set<string>();
    const familyPersonIdsToResolve = new Set<string>();

    for (const kinship of ownerFamilyPersons) {
      const familyPersonId = kinship.person.id;
      const kinshipsFromFamilyPerson = deriveKinships(
        { kind: 'familyPerson', id: familyPersonId },
        edges,
      );
      const connectedMembers = kinshipsFromFamilyPerson.filter(
        (k) => k.person.kind === 'member' && k.person.id !== ownerMemberId,
      );
      if (connectedMembers.length === 0) continue;

      familyPersonIdsToResolve.add(familyPersonId);
      for (const memberKinship of connectedMembers) {
        memberIdsToResolve.add(memberKinship.person.id);
        const chainVisible = memberKinship.pathRelationshipIds.every((id) => {
          const relation = relationshipById.get(id);
          return relation && PUBLIC_VISIBILITY_LEVELS.includes(relation.visibility);
        });
        matches.push({
          familyPersonId,
          familyPersonNome: '',
          sharedWithMemberId: memberKinship.person.id,
          sharedWithNome: '',
          parentescoDoTitular: kinship.label,
          parentescoDoOutroIrmao: chainVisible ? memberKinship.label : null,
        });
      }
    }

    if (matches.length === 0) return ok([]);

    const [familyPersons, resolvedMembers] = await Promise.all([
      this.deps.familyPersonRepository.listByIds(ctx.tenantId, [...familyPersonIdsToResolve]),
      Promise.all([...memberIdsToResolve].map((id) => this.deps.memberRepository.findById(id))),
    ]);
    const familyPersonById = new Map(familyPersons.map((p) => [p.id, p]));
    const memberById = new Map(
      resolvedMembers
        .filter((m): m is NonNullable<typeof m> => m !== null && m.deletedAt === null)
        .map((m) => [m.id, m]),
    );

    return ok(
      matches
        .map((match) => ({
          ...match,
          familyPersonNome: familyPersonById.get(match.familyPersonId)?.nomeCompleto ?? '',
          sharedWithNome: memberById.get(match.sharedWithMemberId)?.nomeCompleto ?? '',
        }))
        // Um dos dois lados não resolveu (Irmão excluído, FamilyPerson órfão) — não mostra meio-nome.
        .filter((match) => match.familyPersonNome && match.sharedWithNome),
    );
  }
}
