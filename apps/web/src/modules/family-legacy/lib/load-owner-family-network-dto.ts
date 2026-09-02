import 'server-only';
import type { AuthContext } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';
import { FAMILY_DISPLAY_GROUPS, type FamilyDisplayGroup } from '@vl6/shared';
import { classifyFamilyDisplayGroup } from './family-display-groups';

export interface FamilyLegacyPersonCardDTO {
  key: string;
  kind: 'member' | 'familyPerson';
  id: string;
  nomeCompleto: string;
  fotoUrl: string | null;
  parentesco: string;
  ladoLinhagem: 'maternal' | 'paternal' | 'both' | 'unknown';
  lifeStatus: 'living' | 'deceased' | 'unknown' | null;
  visibility: string;
  confirmationStatus: string | null;
  /** `true` = aresta direta (ex.: mãe), `false` = derivado (ex.: avô). */
  direct: boolean;
  /** Só presente quando `direct` — usado pelas ações de confirmar/recusar/remover. */
  relationshipId: string | null;
}

export interface PendingConfirmationDTO {
  relationshipId: string;
  otherPartyName: string;
  relationLabel: string;
}

export interface OwnerFamilyNetworkDTO {
  summary: {
    vinculosRegistrados: number;
    geracoesConhecidas: number;
    geracoesMaconicas: number;
    confirmacoesPendentes: number;
  };
  groups: Record<FamilyDisplayGroup, FamilyLegacyPersonCardDTO[]>;
  pendingConfirmations: PendingConfirmationDTO[];
  /** Pessoas que o próprio Irmão gerencia — usadas como opções de "pessoa-âncora" no painel de cadastro, permitindo montar a cadeia aos poucos (bisavô -> avô -> mãe). */
  anchorOptions: { kind: 'member' | 'familyPerson'; id: string; label: string }[];
}

const DECLARED_KINDS = new Set(['declared_kinship', 'guardian_of', 'step_parent_of']);

/**
 * DTO específico para a visão "própria" (docs/architecture — regra de
 * "nunca ler tudo e esconder com CSS"): monta tudo no servidor a partir da
 * cadeia derivada (`ListOwnerFamilyNetworkUseCase`) mais as arestas diretas
 * de tipos que a derivação não propaga (`declared_kinship`, `guardian_of`,
 * `step_parent_of` — não representam parentesco de sangue/casamento
 * encadeável, então nunca aparecem em `deriveKinships`).
 */
export async function loadOwnerFamilyNetworkDTO(
  container: ServerContainer,
  ctx: AuthContext,
  ownerMemberId: string,
): Promise<OwnerFamilyNetworkDTO> {
  const [network, directRelations] = await Promise.all([
    container.useCases.listOwnerFamilyNetwork.execute(ctx, ownerMemberId),
    container.repositories.familyRelationship.listByEndpoint(ctx.tenantId, 'member', ownerMemberId),
  ]);

  const familyPersonById = new Map(network.referencedFamilyPersons.map((p) => [p.id, p]));
  const memberIdsToResolve = new Set(
    network.derivedKinships.filter((k) => k.person.kind === 'member').map((k) => k.person.id),
  );
  for (const relation of directRelations) {
    if (relation.fromKind === 'member' && relation.fromId !== ownerMemberId) {
      memberIdsToResolve.add(relation.fromId);
    }
    if (relation.toKind === 'member' && relation.toId !== ownerMemberId) {
      memberIdsToResolve.add(relation.toId);
    }
  }
  const resolvedMembers = await Promise.all(
    [...memberIdsToResolve].map((id) => container.repositories.member.findById(id)),
  );
  const memberById = new Map(
    resolvedMembers.filter((m): m is NonNullable<typeof m> => m !== null).map((m) => [m.id, m]),
  );

  const groups: Record<FamilyDisplayGroup, FamilyLegacyPersonCardDTO[]> = {
    ascendentes: [],
    familia_proxima: [],
    descendentes: [],
    familia_por_afinidade: [],
    outros_vinculos: [],
  };

  const relationshipById = new Map(network.relationships.map((r) => [r.id, r]));

  for (const kinship of network.derivedKinships) {
    const key = `${kinship.person.kind}:${kinship.person.id}`;
    const displayName =
      kinship.person.kind === 'member'
        ? (memberById.get(kinship.person.id)?.nomeCompleto ?? 'Irmão não encontrado')
        : (familyPersonById.get(kinship.person.id)?.nomeCompleto ?? 'Pessoa não encontrada');
    const familyPerson = kinship.person.kind === 'familyPerson' ? familyPersonById.get(kinship.person.id) : null;
    const member = kinship.person.kind === 'member' ? memberById.get(kinship.person.id) : null;

    // A aresta direta correspondente (quando `direct`) traz visibilidade,
    // confirmação e id pra permitir editar/remover/confirmar a partir do
    // card. Um parentesco derivado (avô, tio...) não tem uma única aresta
    // "dona" — mostra só a leitura calculada.
    const directRelation = kinship.direct
      ? relationshipById.get(kinship.pathRelationshipIds[0]!)
      : undefined;

    groups[classifyFamilyDisplayGroup(kinship.label)].push({
      key,
      kind: kinship.person.kind,
      id: kinship.person.id,
      nomeCompleto: displayName,
      fotoUrl: member?.fotoUrl ?? familyPerson?.fotoUrl ?? null,
      parentesco: kinship.label,
      ladoLinhagem: kinship.lineageSide,
      lifeStatus: familyPerson?.lifeStatus ?? null,
      visibility: directRelation?.visibility ?? familyPerson?.visibility ?? 'private',
      confirmationStatus: directRelation?.confirmationStatus ?? null,
      direct: kinship.direct,
      relationshipId: directRelation?.id ?? null,
    });
  }

  // Vínculos declarados/responsável/padrasto direto no titular — não
  // aparecem em `deriveKinships` (não são propagáveis pela cadeia).
  for (const relation of directRelations) {
    if (!DECLARED_KINDS.has(relation.relationKind)) continue;
    const isFrom = relation.fromKind === 'member' && relation.fromId === ownerMemberId;
    const other = isFrom
      ? { kind: relation.toKind, id: relation.toId }
      : { kind: relation.fromKind, id: relation.fromId };
    const key = `${other.kind}:${other.id}`;
    const familyPerson = other.kind === 'familyPerson' ? familyPersonById.get(other.id) : null;
    const member = other.kind === 'member' ? memberById.get(other.id) : null;
    const displayName = member?.nomeCompleto ?? familyPerson?.nomeCompleto ?? 'Pessoa não encontrada';
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

    groups.outros_vinculos.push({
      key,
      kind: other.kind,
      id: other.id,
      nomeCompleto: displayName,
      fotoUrl: member?.fotoUrl ?? familyPerson?.fotoUrl ?? null,
      parentesco: label,
      ladoLinhagem: 'unknown',
      lifeStatus: familyPerson?.lifeStatus ?? null,
      visibility: relation.visibility,
      confirmationStatus: relation.confirmationStatus,
      direct: true,
      relationshipId: relation.id,
    });
  }

  const vinculosRegistrados = FAMILY_DISPLAY_GROUPS.reduce((acc, group) => acc + groups[group].length, 0);
  const generationValues = new Set(network.derivedKinships.map((k) => k.generation));
  generationValues.add(0); // o próprio titular
  const geracoesConhecidas = generationValues.size;

  // Heurística: conta o próprio Irmão (sempre maçom nesta Loja) mais os
  // ascendentes diretos que já declararam `fraternalLinkStatus:
  // 'has_affiliation'`. O detalhe de trajetória (Loja, Capítulo, Oriente)
  // fica pra Etapa 6 — aqui só existe o sinalizador booleano.
  const geracoesMaconicas =
    1 +
    network.derivedKinships.filter(
      (k) =>
        k.person.kind === 'familyPerson' &&
        classifyFamilyDisplayGroup(k.label) === 'ascendentes' &&
        familyPersonById.get(k.person.id)?.fraternalLinkStatus === 'has_affiliation',
    ).length;

  const confirmacoesPendentes = directRelations.filter((r) => r.confirmationStatus === 'pending').length;

  const pendingConfirmations: PendingConfirmationDTO[] = directRelations
    .filter((r) => r.confirmationStatus === 'pending')
    .map((relation) => {
      const isFrom = relation.fromKind === 'member' && relation.fromId === ownerMemberId;
      const otherId = isFrom ? relation.toId : relation.fromId;
      return {
        relationshipId: relation.id,
        otherPartyName: memberById.get(otherId)?.nomeCompleto ?? 'Irmão não encontrado',
        relationLabel: relation.declaredLabel ?? relation.relationKind,
      };
    });

  const anchorOptions = [
    { kind: 'member' as const, id: ownerMemberId, label: 'Eu' },
    ...FAMILY_DISPLAY_GROUPS.flatMap((group) => groups[group])
      .filter((item) => item.kind === 'familyPerson')
      .map((item) => ({ kind: 'familyPerson' as const, id: item.id, label: `${item.nomeCompleto} (${item.parentesco})` })),
  ];

  return {
    summary: { vinculosRegistrados, geracoesConhecidas, geracoesMaconicas, confirmacoesPendentes },
    groups,
    pendingConfirmations,
    anchorOptions,
  };
}
