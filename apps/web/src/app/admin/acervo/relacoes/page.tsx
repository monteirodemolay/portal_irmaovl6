import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { ArchiveRelation } from '@vl6/domain';
import { ARCHIVE_RELATION_TYPE_LABELS } from '@vl6/shared';
import { Button, DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { softDeleteArchiveRelationAction } from '@/modules/archive/actions/archive-actions';
import { resolveRelationNode } from '@/modules/archive/lib/resolve-relation-node';
import { DeleteRelationButton } from '@/modules/archive/components/delete-relation-button';

interface RelationRow {
  relation: ArchiveRelation;
  origemLabel: string;
  destinoLabel: string;
}

export default async function ArchiveRelationsAdminPage() {
  const session = await requirePagePermission('archiveRelation:read');

  const container = createServerContainer();
  const relations = await container.useCases.listArchiveRelations.execute(session.authContext);

  const rows: RelationRow[] = await Promise.all(
    relations.map(async (relation) => {
      const [origem, destino] = await Promise.all([
        resolveRelationNode(relation.origemTipo, relation.origemId, session.authContext, container),
        resolveRelationNode(
          relation.destinoTipo,
          relation.destinoId,
          session.authContext,
          container,
        ),
      ]);
      return {
        relation,
        origemLabel: origem?.label ?? '(registro removido)',
        destinoLabel: destino?.label ?? '(registro removido)',
      };
    }),
  );

  const columns: DataTableColumn<RelationRow>[] = [
    { key: 'origem', header: 'Origem', cell: (r) => r.origemLabel },
    { key: 'tipo', header: 'Relação', cell: (r) => ARCHIVE_RELATION_TYPE_LABELS[r.relation.tipo] },
    { key: 'destino', header: 'Destino', cell: (r) => r.destinoLabel },
    {
      key: 'acoes',
      header: '',
      cell: (r) => (
        <DeleteRelationButton
          relationLabel={`${r.origemLabel} → ${r.destinoLabel}`}
          onDelete={softDeleteArchiveRelationAction.bind(null, r.relation.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Constelação da Memória</h1>
          <p className="text-muted text-sm">
            Relações entre pessoas, gestões, eventos, coleções e itens do Acervo.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/acervo/relacoes/nova">Nova Relação</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.relation.id}
        emptyState={
          <EmptyState
            title="Nenhuma relação cadastrada ainda"
            action={
              <Button asChild size="sm">
                <Link href="/admin/acervo/relacoes/nova">Nova Relação</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
