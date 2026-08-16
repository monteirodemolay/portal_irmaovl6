import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { ArchiveExhibition } from '@vl6/domain';
import { Badge, Button, DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { PublishToggleButton } from '@/components/admin/publish-toggle-button';
import { publishArchiveExhibitionAction } from '@/modules/archive/actions/archive-actions';

export default async function ArchiveExhibitionsAdminPage() {
  const session = await requirePagePermission('archiveExhibition:read');

  const container = createServerContainer();
  const exhibitions = await container.useCases.listArchiveExhibitions.execute(session.authContext);

  const columns: DataTableColumn<ArchiveExhibition>[] = [
    {
      key: 'titulo',
      header: 'Título',
      cell: (e) => (
        <Link href={`/admin/acervo/exposicoes/${e.id}`} className="font-medium hover:underline">
          {e.titulo}
        </Link>
      ),
    },
    { key: 'slug', header: 'Slug', cell: (e) => e.slug },
    { key: 'secoes', header: 'Seções', cell: (e) => e.secoes.length },
    {
      key: 'status',
      header: 'Status',
      cell: (e) => (
        <Badge variant={e.publicado ? 'success' : 'outline'}>
          {e.publicado ? 'publicada' : 'rascunho'}
        </Badge>
      ),
    },
    {
      key: 'acoes',
      header: '',
      cell: (e) => (
        <PublishToggleButton
          published={e.publicado}
          onToggle={publishArchiveExhibitionAction.bind(null, e.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Exposições Virtuais</h1>
        <Button asChild>
          <Link href="/admin/acervo/exposicoes/novo">Nova Exposição</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={exhibitions}
        getRowId={(e) => e.id}
        emptyState={
          <EmptyState
            title="Nenhuma exposição criada ainda"
            action={
              <Button asChild size="sm">
                <Link href="/admin/acervo/exposicoes/novo">Nova Exposição</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
