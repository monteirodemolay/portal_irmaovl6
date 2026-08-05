import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { News } from '@vl6/domain';
import { Badge, Button, DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { toggleNewsPublishedAction } from '@/modules/content/actions/content-actions';
import { PublishToggleButton } from '@/components/admin/publish-toggle-button';

export default async function NewsPage() {
  const session = await requirePagePermission('news:read');

  const container = createServerContainer();
  const page = await container.useCases.listAllNews.execute(session.authContext, { limit: 50 });

  const columns: DataTableColumn<News>[] = [
    {
      key: 'titulo',
      header: 'Título',
      cell: (n) => (
        <Link href={`/admin/noticias/${n.id}`} className="font-medium hover:underline">
          {n.titulo}
        </Link>
      ),
    },
    { key: 'categoria', header: 'Categoria', cell: (n) => n.categoria },
    {
      key: 'status',
      header: 'Status',
      cell: (n) => (
        <Badge variant={n.publicado ? 'success' : 'outline'}>
          {n.publicado ? 'publicada' : 'rascunho'}
        </Badge>
      ),
    },
    {
      key: 'acoes',
      header: '',
      cell: (n) => (
        <PublishToggleButton
          published={n.publicado}
          onToggle={toggleNewsPublishedAction.bind(null, n.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Notícias</h1>
        <Button asChild>
          <Link href="/admin/noticias/nova">Nova Notícia</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={page.items}
        getRowId={(n) => n.id}
        emptyState={
          <EmptyState
            title="Nenhuma notícia cadastrada"
            action={
              <Button asChild size="sm">
                <Link href="/admin/noticias/nova">Nova Notícia</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
