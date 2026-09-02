import type {
  FamilyChildRole,
  FamilyParentRole,
  FamilyPersonRefKind,
  FamilyRelationKind,
} from '@vl6/shared';

/**
 * Derivação de parentesco por cadeia (03_ARQUITETURA_E_DADOS.md — "Avô,
 * bisavô, neto, tio, sobrinho, primo, sogro, genro, nora e cunhado devem ser
 * derivados da cadeia sempre que possível"). Função pura: recebe as arestas
 * já filtradas pelo tenant e não toca em repositório nenhum — chamada tanto
 * pelo caso de uso `DeriveFamilyKinshipsUseCase` quanto diretamente pelos
 * testes de domínio.
 */

export interface FamilyRef {
  kind: FamilyPersonRefKind;
  id: string;
}

export interface RelationshipEdge {
  id: string;
  from: FamilyRef;
  to: FamilyRef;
  relationKind: FamilyRelationKind;
  parentRole: FamilyParentRole | null;
  childRole: FamilyChildRole | null;
}

export interface DerivedKinship {
  person: FamilyRef;
  label: string;
  generation: number;
  lineageSide: 'maternal' | 'paternal' | 'both' | 'unknown';
  /** IDs das relações usadas no cálculo, na ordem percorrida — preserva o caminho explicável exigido pelo pacote de implantação. */
  pathRelationshipIds: string[];
  /** `true` quando o parentesco é uma aresta direta (ex.: pai/filho), `false` quando é derivado (ex.: avô). */
  direct: boolean;
}

const DEFAULT_MAX_DEPTH = 4;

const keyOf = (ref: FamilyRef) => `${ref.kind}:${ref.id}`;
const sameRef = (a: FamilyRef, b: FamilyRef) => a.kind === b.kind && a.id === b.id;

interface Step {
  person: FamilyRef;
  generation: number;
  path: string[];
  pathKinds: string[];
  firstParentRole: FamilyParentRole | null;
}

interface Transition {
  person: FamilyRef;
  kind: 'parent' | 'child' | 'spouse' | 'sibling';
  generationDelta: -1 | 0 | 1;
  parentRole: FamilyParentRole | null;
}

function transitionsFrom(person: FamilyRef, edge: RelationshipEdge): Transition[] {
  if (edge.relationKind === 'parent_of' || edge.relationKind === 'adoptive_parent_of') {
    if (sameRef(person, edge.to)) {
      return [
        { person: edge.from, kind: 'parent', generationDelta: -1, parentRole: edge.parentRole },
      ];
    }
    if (sameRef(person, edge.from)) {
      return [{ person: edge.to, kind: 'child', generationDelta: 1, parentRole: null }];
    }
  }

  if (edge.relationKind === 'spouse_of' || edge.relationKind === 'partner_of') {
    if (sameRef(person, edge.from)) {
      return [{ person: edge.to, kind: 'spouse', generationDelta: 0, parentRole: null }];
    }
    if (sameRef(person, edge.to)) {
      return [{ person: edge.from, kind: 'spouse', generationDelta: 0, parentRole: null }];
    }
  }

  if (edge.relationKind === 'sibling_of') {
    if (sameRef(person, edge.from)) {
      return [{ person: edge.to, kind: 'sibling', generationDelta: 0, parentRole: null }];
    }
    if (sameRef(person, edge.to)) {
      return [{ person: edge.from, kind: 'sibling', generationDelta: 0, parentRole: null }];
    }
  }

  return [];
}

function resolveLineageSide(role: FamilyParentRole | null): DerivedKinship['lineageSide'] {
  if (role === 'mae') return 'maternal';
  if (role === 'pai') return 'paternal';
  return 'unknown';
}

const KINSHIP_LABELS_BY_SIGNATURE: Record<string, string> = {
  parent: 'Pai ou mãe',
  child: 'Filho ou filha',
  spouse: 'Cônjuge',
  sibling: 'Irmão ou irmã',
  'parent>parent': 'Avô ou avó',
  'parent>parent>parent': 'Bisavô ou bisavó',
  'parent>parent>parent>parent': 'Trisavô ou trisavó',
  'child>child': 'Neto ou neta',
  'child>child>child': 'Bisneto ou bisneta',
  'parent>sibling': 'Tio ou tia',
  'sibling>child': 'Sobrinho ou sobrinha',
  'parent>sibling>child': 'Primo ou prima',
  'spouse>parent': 'Sogro ou sogra',
  'child>spouse': 'Genro ou nora',
  'spouse>sibling': 'Cunhado ou cunhada',
  'sibling>spouse': 'Cunhado ou cunhada',
};

function resolveKinshipLabel(
  pathKinds: string[],
  firstParentRole: FamilyParentRole | null,
): string | null {
  const signature = pathKinds.join('>');
  const base = KINSHIP_LABELS_BY_SIGNATURE[signature];
  if (!base) return null;

  const isAscendantLine = pathKinds.every((kind) => kind === 'parent');
  const side =
    firstParentRole === 'mae' ? ' materno(a)' : firstParentRole === 'pai' ? ' paterno(a)' : '';
  return isAscendantLine && pathKinds.length > 1 ? `${base}${side}` : base;
}

/**
 * Percorre a rede a partir de `owner` (BFS, menor caminho vence) e devolve
 * todo parentesco explicável encontrado até `maxDepth` arestas de distância
 * (padrão 4 gerações — regra de integridade do pacote de implantação).
 */
export function deriveKinships(
  owner: FamilyRef,
  edges: RelationshipEdge[],
  maxDepth = DEFAULT_MAX_DEPTH,
): DerivedKinship[] {
  const queue: Step[] = [
    { person: owner, generation: 0, path: [], pathKinds: [], firstParentRole: null },
  ];
  const bestDepth = new Map<string, number>([[keyOf(owner), 0]]);
  const results: DerivedKinship[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.path.length >= maxDepth) continue;

    for (const edge of edges) {
      for (const transition of transitionsFrom(current.person, edge)) {
        if (sameRef(transition.person, owner)) continue; // nunca aponta de volta pro próprio titular

        const nextDepth = current.path.length + 1;
        const nextKey = keyOf(transition.person);
        const previousDepth = bestDepth.get(nextKey);
        if (previousDepth !== undefined && previousDepth <= nextDepth) continue;

        const path = [...current.path, edge.id];
        const pathKinds = [...current.pathKinds, transition.kind];
        const firstParentRole = current.firstParentRole ?? transition.parentRole;
        const label = resolveKinshipLabel(pathKinds, firstParentRole);

        bestDepth.set(nextKey, nextDepth);
        queue.push({
          person: transition.person,
          generation: current.generation + transition.generationDelta,
          path,
          pathKinds,
          firstParentRole,
        });

        if (label) {
          results.push({
            person: transition.person,
            label,
            generation: current.generation + transition.generationDelta,
            lineageSide: resolveLineageSide(firstParentRole),
            pathRelationshipIds: path,
            direct: path.length === 1,
          });
        }
      }
    }
  }

  return results;
}

/**
 * Verdadeiro se acrescentar `parent -> child` (uma aresta `parent_of`/
 * `adoptive_parent_of`) tornaria `parent` descendente de `child` na cadeia
 * já existente — ou seja, criaria um ciclo de ascendência. Chamado pelo caso
 * de uso ANTES de persistir a relação.
 */
export function wouldCreateAncestryCycle(
  parent: FamilyRef,
  child: FamilyRef,
  existingEdges: RelationshipEdge[],
): boolean {
  if (sameRef(parent, child)) return true;

  // Sobe a cadeia de ascendentes de `parent` (o futuro pai/mãe): se `child`
  // (o futuro filho) já aparece nessa cadeia, então `child` já é ascendente
  // de `parent` hoje — a nova aresta `parent -> child` fecharia um ciclo
  // (child -> ... -> parent -> child).
  const visited = new Set<string>([keyOf(parent)]);
  const queue: FamilyRef[] = [parent];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of existingEdges) {
      if (edge.relationKind !== 'parent_of' && edge.relationKind !== 'adoptive_parent_of') continue;
      if (!sameRef(edge.to, current)) continue; // edge.from é pai/mãe de edge.to (current)
      if (sameRef(edge.from, child)) return true;
      const key = keyOf(edge.from);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push(edge.from);
    }
  }

  return false;
}
