import type { FamilyDisplayGroup, FamilyVisibilityLevel, PersonLifeStatus } from '@vl6/shared';
import { classifyFamilyDisplayGroup } from '@vl6/shared';
import type { IFamilyPersonRepository } from '../../family-legacy/repositories/family-person.repository';
import type { IFamilyRelationshipRepository } from '../../family-legacy/repositories/family-relationship.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IPersonFraternalRecordRepository } from '../../family-legacy/repositories/person-fraternal-record.repository';
import {
  deriveKinships,
  type FamilyRef,
  type RelationshipEdge,
} from '../../family-legacy/services/derive-kinships';

export interface PublicFamiliaLegadoItemDTO {
  key: string;
  kind: 'member' | 'familyPerson';
  id: string;
  nomeCompleto: string;
  fotoUrl: string | null;
  parentesco: string;
  lifeStatus: PersonLifeStatus | null;
  /**
   * Aniversário natalício — só preenchido pra `familyPerson` (familiar sem
   * cadastro de `Member`). Um familiar `kind === 'member'` nunca expõe essa
   * data aqui, mesmo tratamento de privacidade já dado a
   * `Member.dataNascimento` no resto do perfil público — nunca sai do
   * registro institucional do próprio Irmão. Usado só pra ordenar a lista
   * pelo próximo aniversário a acontecer (pedido do Administrador).
   */
  dataNascimento: Date | null;
  /**
   * `true` quando a pessoa é Maçom — sempre `true` pra `kind === 'member'`
   * (Irmão cadastrado no Portal); pra `familyPerson`, checa se existe algum
   * `PersonFraternalRecord` com `affiliationKind === 'mason'` e visível
   * publicamente (um familiar pode ter vínculo com outra ordem
   * paramaçônica — DeMolay, Filhas de Jó etc. — sem ser Maçom).
   */
  isMacom: boolean;
}

export type PublicFamiliaLegadoDTO = Partial<Record<FamilyDisplayGroup, PublicFamiliaLegadoItemDTO[]>>;

const PUBLIC_VISIBILITY_LEVELS: readonly FamilyVisibilityLevel[] = ['members', 'archive'];
const DECLARED_KINDS = new Set(['declared_kinship', 'guardian_of', 'step_parent_of']);

export interface BuildPublicFamiliaLegadoDeps {
  familyRelationshipRepository: IFamilyRelationshipRepository;
  familyPersonRepository: IFamilyPersonRepository;
  memberRepository: IMemberRepository;
  personFraternalRecordRepository: IPersonFraternalRecordRepository;
}

/**
 * Recorte "para terceiros" da rede de Família e Legado — ao contrário de
 * `loadOwnerFamilyNetworkDTO` (visão própria, sem filtro), aqui só entra o
 * que o próprio Irmão (ou quem cadastrou o familiar) marcou como visível pra
 * `'members'` ou `'archive'` (`FAMILY_VISIBILITY_LEVELS`, `@vl6/shared`) —
 * `'private'`/`'administration'` nunca aparecem no perfil público da
 * Central. Um parentesco derivado (ex.: avô) só entra se TODA a cadeia de
 * relações que o gerou for visível — um elo privado no meio quebra a
 * derivação pra fins de exibição pública, mesmo que as pontas sejam
 * visíveis. Vive no pacote de domínio (não em `apps/web`) porque
 * `GetPublicMemberProfileUseCase` só recebe repositórios como dependência.
 */
export async function buildPublicFamiliaLegado(
  deps: BuildPublicFamiliaLegadoDeps,
  tenantId: string,
  targetMemberId: string,
): Promise<PublicFamiliaLegadoDTO | null> {
  const allRelations = await deps.familyRelationshipRepository.listByTenant(tenantId);
  const activeRelations = allRelations.filter((relation) => !relation.deletedAt);
  const relationshipById = new Map(activeRelations.map((r) => [r.id, r]));

  const anchor: FamilyRef = { kind: 'member', id: targetMemberId };
  const edges: RelationshipEdge[] = activeRelations.map((relation) => ({
    id: relation.id,
    from: { kind: relation.fromKind, id: relation.fromId },
    to: { kind: relation.toKind, id: relation.toId },
    relationKind: relation.relationKind,
    parentRole: relation.parentRole,
    childRole: relation.childRole,
  }));
  const derivedKinships = deriveKinships(anchor, edges);

  type Entry = { ref: FamilyRef; label: string };
  const visibleEntries: Entry[] = [];

  for (const kinship of derivedKinships) {
    const chainVisible = kinship.pathRelationshipIds.every((id) => {
      const relation = relationshipById.get(id);
      return relation && PUBLIC_VISIBILITY_LEVELS.includes(relation.visibility);
    });
    if (chainVisible) visibleEntries.push({ ref: kinship.person, label: kinship.label });
  }

  // Vínculos declarados/responsável/padrasto direto no titular não passam
  // por `deriveKinships` (não são propagáveis pela cadeia) — mesmo recorte
  // de `loadOwnerFamilyNetworkDTO`, só que filtrado por visibilidade aqui.
  const directRelations = activeRelations.filter(
    (relation) =>
      DECLARED_KINDS.has(relation.relationKind) &&
      PUBLIC_VISIBILITY_LEVELS.includes(relation.visibility) &&
      ((relation.fromKind === 'member' && relation.fromId === targetMemberId) ||
        (relation.toKind === 'member' && relation.toId === targetMemberId)),
  );
  for (const relation of directRelations) {
    const isFrom = relation.fromKind === 'member' && relation.fromId === targetMemberId;
    const other: FamilyRef = isFrom
      ? { kind: relation.toKind, id: relation.toId }
      : { kind: relation.fromKind, id: relation.fromId };
    const label =
      relation.relationKind === 'declared_kinship'
        ? (relation.declaredLabel ?? 'Parentesco declarado')
        : relation.relationKind === 'guardian_of'
          ? isFrom
            ? 'Sob responsabilidade de'
            : 'Responsável por'
          : isFrom
            ? 'Padrasto ou madrasta de'
            : 'Enteado(a) de';
    visibleEntries.push({ ref: other, label });
  }

  if (visibleEntries.length === 0) return null;

  const familyPersonIds = [
    ...new Set(visibleEntries.filter((e) => e.ref.kind === 'familyPerson').map((e) => e.ref.id)),
  ];
  const memberIds = [
    ...new Set(visibleEntries.filter((e) => e.ref.kind === 'member').map((e) => e.ref.id)),
  ];
  const [familyPersons, resolvedMembers, fraternalRecordsByPersonId] = await Promise.all([
    familyPersonIds.length > 0
      ? deps.familyPersonRepository.listByIds(tenantId, familyPersonIds)
      : Promise.resolve([]),
    Promise.all(memberIds.map((id) => deps.memberRepository.findById(id))),
    Promise.all(
      familyPersonIds.map(async (id) => {
        const records = await deps.personFraternalRecordRepository.listByPerson(
          tenantId,
          'familyPerson',
          id,
        );
        return [id, records] as const;
      }),
    ),
  ]);
  const familyPersonById = new Map(familyPersons.map((p) => [p.id, p]));
  const memberById = new Map(
    resolvedMembers.filter((m): m is NonNullable<typeof m> => m !== null).map((m) => [m.id, m]),
  );
  const fraternalRecordsById = new Map(fraternalRecordsByPersonId);
  // Só considera Maçom quando existe um registro de afiliação
  // `affiliationKind === 'mason'` (não qualquer vínculo paramaçônico —
  // DeMolay/Filhas de Jó/Estrela do Oriente também usam `has_affiliation`)
  // que o próprio familiar (ou quem o cadastrou) marcou visível publicamente.
  const isFamilyPersonMacom = (id: string) =>
    (fraternalRecordsById.get(id) ?? []).some(
      (record) =>
        record.affiliationKind === 'mason' && PUBLIC_VISIBILITY_LEVELS.includes(record.visibility),
    );

  const groups: PublicFamiliaLegadoDTO = {};
  for (const entry of visibleEntries) {
    // Uma pessoa marcada como `familyPerson` com o próprio registro fora de
    // `'members'`/`'archive'` nunca aparece, mesmo que a aresta que a liga
    // ao titular esteja visível — visibilidade em dobro (aresta + pessoa).
    const familyPerson = entry.ref.kind === 'familyPerson' ? familyPersonById.get(entry.ref.id) : null;
    if (entry.ref.kind === 'familyPerson') {
      if (!familyPerson || !PUBLIC_VISIBILITY_LEVELS.includes(familyPerson.visibility)) continue;
    }
    const member = entry.ref.kind === 'member' ? memberById.get(entry.ref.id) : null;
    if (entry.ref.kind === 'member' && !member) continue;

    const displayName = member?.nomeCompleto ?? familyPerson?.nomeCompleto ?? 'Familiar sem dados cadastrados';
    const group = classifyFamilyDisplayGroup(entry.label);
    const item: PublicFamiliaLegadoItemDTO = {
      key: `${entry.ref.kind}:${entry.ref.id}`,
      kind: entry.ref.kind,
      id: entry.ref.id,
      nomeCompleto: displayName,
      fotoUrl: member?.fotoUrl ?? familyPerson?.fotoUrl ?? null,
      parentesco: entry.label,
      lifeStatus: familyPerson?.lifeStatus ?? null,
      dataNascimento: familyPerson?.dataNascimento ?? null,
      isMacom: entry.ref.kind === 'member' ? true : isFamilyPersonMacom(entry.ref.id),
    };
    (groups[group] ??= []).push(item);
  }

  return Object.keys(groups).length > 0 ? groups : null;
}
