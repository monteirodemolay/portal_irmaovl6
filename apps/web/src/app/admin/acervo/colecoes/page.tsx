import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { ArchiveCollection } from '@vl6/domain';
import { Badge, Button, DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { PublishToggleButton } from '@/components/admin/publish-toggle-button';
import { publishArchiveCollectionAction } from '@/modules/archive/actions/archive-actions';

export default async function ArchiveCollectionsAdminPage() {
  const session = await requirePagePermission('archiveCollection:read');

  const container = createServerContainer();
  const collections = await container.useCases.listArchiveCollections.execute(session.authContext);

  const columns: DataTableColumn<ArchiveCollection>[] = [
    {
      key: 'titulo',
      header: 'Título',
      cell: (c) => (
        <Link href={`/admin/acervo/colecoes/${c.id}`} className="font-medium hover:underline">
          {c.titulo}
        </Link>
      ),
    },
    { key: 'slug', header: 'Slug', cell: (c) => c.slug },
    { key: 'itens', header: 'Itens', cell: (c) => c.itemIds.length },
    {
      key: 'status',
      header: 'Status',
      cell: (c) => (
        <Badge variant={c.publicado ? 'success' : 'outline'}>
          {c.publicado ? 'publicada' : 'rascunho'}
        </Badge>
      ),
    },
    {
      key: 'acoes',
      header: '',
      cell: (c) => (
        <PublishToggleButton
          published={c.publicado}
          onToggle={publishArchiveCollectionAction.bind(null, c.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Coleções do Acervo</h1>
        <Button asChild>
          <Link href="/admin/acervo/colecoes/novo">Nova Coleção</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={collections}
        getRowId={(c) => c.id}
        emptyState={
          <EmptyState
            title="Nenhuma coleção criada ainda"
            action={
              <Button asChild size="sm">
                <Link href="/admin/acervo/colecoes/novo">Nova Coleção</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
