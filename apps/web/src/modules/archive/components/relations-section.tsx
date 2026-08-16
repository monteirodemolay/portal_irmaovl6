import Link from 'next/link';
import type { AuthContext } from '@vl6/domain';
import { hasPermission } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';
import type { ArchiveRelationNodeKind } from '@vl6/shared';
import { ConstellationGraph } from '@vl6/ui';
import { buildRelationEdges } from '../lib/build-relation-edges';

/**
 * Seção "Constelação da Memória" injetada nas páginas do Acervo que já têm
 * ID canônico próprio (Item, Pessoa, Gestão, Coleção) — nunca renderiza
 * nada quando não há relações, para não poluir uma página que ainda não
 * foi conectada a nada.
 */
export async function RelationsSection({
  nodeTipo,
  nodeId,
  centerLabel,
  centerKindLabel,
  authContext,
  container,
}: {
  nodeTipo: ArchiveRelationNodeKind;
  nodeId: string;
  centerLabel: string;
  centerKindLabel: string;
  authContext: AuthContext;
  container: ServerContainer;
}) {
  if (!hasPermission(authContext, 'archiveRelation:read')) return null;

  const relations = await container.useCases.listRelationsForNode.execute(
    authContext,
    nodeTipo,
    nodeId,
  );
  if (relations.length === 0) return null;

  const edges = await buildRelationEdges(nodeTipo, nodeId, relations, authContext, container);
  if (edges.length === 0) return null;

  return (
    <section
      aria-labelledby="constelacao-title"
      className="border-border rounded-[16px] border p-5"
    >
      <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
        Constelação da Memória
      </p>
      <h2 id="constelacao-title" className="font-display mt-1 text-lg font-semibold">
        Relações
      </h2>
      <div className="mt-4">
        <ConstellationGraph
          centerLabel={centerLabel}
          centerKindLabel={centerKindLabel}
          edges={edges}
          linkComponent={Link}
        />
      </div>
    </section>
  );
}
