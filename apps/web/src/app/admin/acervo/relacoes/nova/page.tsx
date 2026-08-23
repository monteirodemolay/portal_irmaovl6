import { createServerContainer } from '@vl6/infra';
import { ARCHIVE_RELATION_NODE_KIND_LABELS, type ArchiveRelationNodeKind } from '@vl6/shared';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { loadRelationNodeOptions } from '@/modules/archive/lib/load-relation-node-options';
import { ArchiveRelationForm } from '@/modules/archive/components/archive-relation-form';

export default async function NewArchiveRelationPage() {
  const session = await requirePagePermission('archiveRelation:create');

  const container = createServerContainer();
  const options = await loadRelationNodeOptions(session.authContext, container, session.role);

  const groups = Object.entries(
    options.reduce<Record<ArchiveRelationNodeKind, typeof options>>(
      (acc, option) => {
        acc[option.tipo] = [...(acc[option.tipo] ?? []), option];
        return acc;
      },
      {} as Record<ArchiveRelationNodeKind, typeof options>,
    ),
  ).map(([tipo, items]) => ({
    tipo: tipo as ArchiveRelationNodeKind,
    label: ARCHIVE_RELATION_NODE_KIND_LABELS[tipo as ArchiveRelationNodeKind],
    items,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Nova Relação</h1>
        <p className="text-muted text-sm">
          Conecta dois registros já existentes na Constelação da Memória, sem duplicar nenhum dado.
        </p>
      </div>

      <ArchiveRelationForm groups={groups} />
    </div>
  );
}
