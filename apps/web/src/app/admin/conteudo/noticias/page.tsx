import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { News } from '@vl6/domain';
import { Badge, Button, DataTable, EmptyState, Pagination, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  deleteNewsAction,
  hardDeleteNewsAction,
  setNewsPrimaryHighlightAction,
  toggleNewsFeaturedAction,
  toggleNewsPublishedAction,
} from '@/modules/content/actions/content-actions';
import { PublishToggleButton } from '@/components/admin/publish-toggle-button';
import { DeleteButton } from '@/components/admin/delete-button';
import { ConcludedTabNav } from '@/components/admin/concluded-tab-nav';
import { ImportNewsPanel } from '@/modules/content/components/import-news-panel';
import { BackfillNewsDatesPanel } from '@/modules/content/components/backfill-news-dates-panel';

const BASE_PATH = '/admin/conteudo/noticias';
const PAGE_SIZE = 20;

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; cursor?: string }>;
}) {
  const session = await requirePagePermission('news:read');
  const { aba, cursor } = await searchParams;
  const isConcluded = aba === 'concluidos';

  const container = createServerContainer();

  if (isConcluded) {
    const page = await container.useCases.listConcludedNews.execute(session.authContext, {
      cursor,
      limit: PAGE_SIZE,
    });

    const columns: DataTableColumn<News>[] = [
      {
        key: 'titulo',
        header: 'Título',
        cell: (n) => <span className="font-medium">{n.titulo}</span>,
      },
      { key: 'status', header: 'Status', cell: () => 'excluída' },
      {
        key: 'acoes',
        header: '',
        cell: (n) => (
          <DeleteButton
            action={hardDeleteNewsAction.bind(null, n.id)}
            confirmMessage={`Excluir "${n.titulo}" definitivamente? Não tem como desfazer.`}
            label="Excluir permanentemente"
            variant="destructive"
          />
        ),
      },
    ];

    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-semibold">Notícias</h1>
        <ConcludedTabNav basePath={BASE_PATH} aba="concluidos" />
        <DataTable
          columns={columns}
          rows={page.items}
          getRowId={(n) => n.id}
          emptyState={<EmptyState title="Nenhuma notícia excluída" />}
        />
        <Pagination
          hasPrevious={Boolean(cursor) && Number(cursor) > 0}
          hasNext={page.hasMore}
          previousHref={`${BASE_PATH}?aba=concluidos&cursor=${Math.max(0, Number(cursor ?? 0) - PAGE_SIZE)}`}
          nextHref={page.nextCursor ? `${BASE_PATH}?aba=concluidos&cursor=${page.nextCursor}` : ''}
        />
      </div>
    );
  }

  const page = await container.useCases.listAllNews.execute(session.authContext, { limit: 100 });

  const columns: DataTableColumn<News>[] = [
    {
      key: 'titulo',
      header: 'Título',
      cell: (n) => (
        <div className="min-w-[260px]">
          <Link href={`${BASE_PATH}/${n.id}`} className="font-medium hover:underline">
            {n.titulo}
          </Link>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {Boolean(n.destaquePrincipal) && <Badge variant="accent">principal</Badge>}
            {!n.destaquePrincipal && Boolean(n.destaque) && <Badge variant="outline">destaque</Badge>}
          </div>
        </div>
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
        <div className="flex flex-wrap items-center justify-end gap-2">
          <form action={toggleNewsFeaturedAction.bind(null, n.id, !Boolean(n.destaque))}>
            <Button type="submit" size="sm" variant="outline">
              {n.destaque ? 'Remover destaque' : 'Destacar'}
            </Button>
          </form>
          {!n.destaquePrincipal && (
            <form action={setNewsPrimaryHighlightAction.bind(null, n.id)}>
              <Button type="submit" size="sm" variant="outline">
                Tornar principal
              </Button>
            </form>
          )}
          <PublishToggleButton
            published={n.publicado}
            onToggle={toggleNewsPublishedAction.bind(null, n.id)}
          />
          <DeleteButton
            action={deleteNewsAction.bind(null, n.id)}
            confirmMessage={`Excluir "${n.titulo}"? Fica registrado em Concluídos.`}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Notícias</h1>
          <p className="text-muted mt-1 text-sm">
            Gerencie publicação, importação e a hierarquia editorial exibida no Portal.
          </p>
        </div>
        <Button asChild>
          <Link href={`${BASE_PATH}/nova`}>Nova Notícia</Link>
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ImportNewsPanel />
        <BackfillNewsDatesPanel />
      </div>

      <div className="border-border bg-surface rounded-xl border p-4 text-sm">
        <p className="font-medium">Como funcionam os destaques</p>
        <p className="text-muted mt-1 leading-relaxed">
          Você pode marcar várias matérias como destaque. Apenas uma pode ser a principal. Ao clicar
          em “Tornar principal”, a anterior perde automaticamente essa condição, sem deixar de ser
          destaque.
        </p>
      </div>

      <ConcludedTabNav basePath={BASE_PATH} aba="principal" />

      <DataTable
        columns={columns}
        rows={page.items}
        getRowId={(n) => n.id}
        emptyState={
          <EmptyState
            title="Nenhuma notícia cadastrada"
            action={
              <Button asChild size="sm">
                <Link href={`${BASE_PATH}/nova`}>Nova Notícia</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
