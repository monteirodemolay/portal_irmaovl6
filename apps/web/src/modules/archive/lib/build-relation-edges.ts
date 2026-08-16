import 'server-only';
import type { AuthContext, ArchiveRelation } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';
import { ARCHIVE_RELATION_TYPE_LABELS, type ArchiveRelationNodeKind } from '@vl6/shared';
import type { ConstellationEdge } from '@vl6/ui';
import { resolveRelationNode } from './resolve-relation-node';

/**
 * Converte relações brutas (`ArchiveRelation`) nas arestas exibíveis do
 * `ConstellationGraph` a partir do ponto de vista de um nó específico —
 * resolve o nó do outro lado de cada relação e descarta silenciosamente
 * qualquer relação cujo outro lado não resolva mais (registro removido,
 * despublicado ou de outro tenant).
 */
export async function buildRelationEdges(
  nodeTipo: ArchiveRelationNodeKind,
  nodeId: string,
  relations: ArchiveRelation[],
  authContext: AuthContext,
  container: ServerContainer,
): Promise<ConstellationEdge[]> {
  const resolved = await Promise.all(
    relations.map(async (relation): Promise<ConstellationEdge | null> => {
      const isOrigem = relation.origemTipo === nodeTipo && relation.origemId === nodeId;
      const otherTipo = isOrigem ? relation.destinoTipo : relation.origemTipo;
      const otherId = isOrigem ? relation.destinoId : relation.origemId;

      const other = await resolveRelationNode(otherTipo, otherId, authContext, container);
      if (!other) return null;

      return {
        relationLabel: ARCHIVE_RELATION_TYPE_LABELS[relation.tipo],
        descricao: relation.descricao,
        node: {
          key: relation.id,
          label: other.label,
          kindLabel: other.kindLabel,
          href: other.href,
        },
      };
    }),
  );

  return resolved.filter((edge): edge is ConstellationEdge => edge !== null);
}
