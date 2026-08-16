import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { ArchiveCatalogEntry } from '@vl6/domain';
import { Badge, Button, DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { PublishToggleButton } from '@/components/admin/publish-toggle-button';
import { publishArchiveCatalogEntryAction } from '@/modules/archive/actions/archive-actions';
import { resolveArchiveItem } from '@/modules/archive/lib/resolve-archive-item';

interface CatalogEntryRow {
  entry: ArchiveCatalogEntry;
  itemLabel: string;
}

export default async function ArchiveCatalogEntriesAdminPage() {
  const session = await requirePagePermission('archiveCatalog:read');

  const container = createServerContainer();
  const entries = await container.useCases.listArchiveCatalogEntries.execute(session.authContext);

  const rows: CatalogEntryRow[] = await Promise.all(
    entries.map(async (entry) => {
      const item = await resolveArchiveItem(entry.origemId, session.authContext, container);
      return {
        entry,
        itemLabel: item ? `${item.kindLabel} · ${item.titulo}` : '(registro removido)',
      };
    }),
  );

  const columns: DataTableColumn<CatalogEntryRow>[] = [
    {
      key: 'item',
      header: 'Item',
      cell: (r) => (
        <Link
          href={`/admin/acervo/catalogacao/${r.entry.id}`}
          className="font-medium hover:underline"
        >
          {r.itemLabel}
        </Link>
      ),
    },
    { key: 'titulo', header: 'Título curado', cell: (r) => r.entry.tituloCurado ?? '—' },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <Badge variant={r.entry.publicado ? 'success' : 'outline'}>
          {r.entry.publicado ? 'publicada' : 'rascunho'}
        </Badge>
      ),
    },
    {
      key: 'acoes',
      header: '',
      cell: (r) => (
        <PublishToggleButton
          published={r.entry.publicado}
          onToggle={publishArchiveCatalogEntryAction.bind(null, r.entry.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Catalogação</h1>
          <p className="text-muted text-sm">
            Fichas de catalogação formal — enriquecem itens já existentes do Acervo com título
            curado, contexto histórico e tags, sem migrar nem duplicar o registro de origem.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/acervo/catalogacao/nova">Nova Ficha</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.entry.id}
        emptyState={
          <EmptyState
            title="Nenhuma ficha de catalogação criada ainda"
            action={
              <Button asChild size="sm">
                <Link href="/admin/acervo/catalogacao/nova">Nova Ficha</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
