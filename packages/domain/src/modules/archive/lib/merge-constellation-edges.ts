import type { ExplorerEdge } from '../dtos/constellation-explorer.dto';

/**
 * Relações editoriais confirmadas (`curated`) têm precedência sobre uma
 * relação derivada equivalente — quando a mesma aresta (origem+destino+
 * tipo) existe nos dois conjuntos, só a versão `curated` aparece. Chave de
 * deduplicação normaliza a ordem das pontas quando o tipo é conceitualmente
 * simétrico (ex.: "relacionado_a"), pra não duplicar visualmente A→B e B→A.
 */
const SYMMETRIC_RELATION_TYPES = new Set(['relacionado_a']);

export function mergeConstellationEdges(
  derived: ExplorerEdge[],
  curated: ExplorerEdge[],
): ExplorerEdge[] {
  const result = new Map<string, ExplorerEdge>();

  for (const edge of derived) {
    result.set(edgeKey(edge), edge);
  }
  for (const edge of curated) {
    result.set(edgeKey(edge), edge);
  }

  return Array.from(result.values());
}

function edgeKey(edge: ExplorerEdge): string {
  const [a, b] = SYMMETRIC_RELATION_TYPES.has(edge.relationType)
    ? [edge.sourceKey, edge.targetKey].sort()
    : [edge.sourceKey, edge.targetKey];
  return [a, b, edge.relationType].join('|');
}
