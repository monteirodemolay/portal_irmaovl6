import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { Announcement } from '@vl6/domain';
import { Badge, Button, DataTable, EmptyState, Pagination, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  deleteAnnouncementAction,
  hardDeleteAnnouncementAction,
  toggleAnnouncementPublishedAction,
} from '@/modules/content/actions/content-actions';
import { PublishToggleButton } from '@/components/admin/publish-toggle-button';
import { DeleteButton } from '@/components/admin/delete-button';
import { ConcludedTabNav } from '@/components/admin/concluded-tab-nav';

const PRIORITY_VARIANT = { baixa: 'default', media: 'warning', alta: 'destructive' } as const;
const BASE_PATH = '/admin/conteudo/avisos';
const PAGE_SIZE = 20;

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; cursor?: string }>;
}) {
  const session = await requirePagePermission('announcement:read');
  const { aba, cursor } = await searchParams;
  const isConcluded = aba === 'concluidos';

  const container = createServerContainer();

  if (isConcluded) {
    const page = await container.useCases.listConcludedAnnouncements.execute(session.authContext, {
      cursor,
      limit: PAGE_SIZE,
    });

    const columns: DataTableColumn<Announcement>[] = [
      {
        key: 'titulo',
        header: 'Título',
        cell: (a) => <span className="font-medium">{a.titulo}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        cell: (a) => (a.deletedAt ? 'excluído' : 'vencido'),
      },
      {
        key: 'acoes',
        header: '',
        cell: (a) => (
          <DeleteButton
            action={hardDeleteAnnouncementAction.bind(null, a.id)}
            confirmMessage={`Excluir "${a.titulo}" definitivamente? Não tem como desfazer.`}
            label="Excluir permanentemente"
            variant="destructive"
          />
        ),
      },
    ];

    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-semibold">Avisos</h1>
        <ConcludedTabNav basePath={BASE_PATH} aba="concluidos" />
        <DataTable
          columns={columns}
          rows={page.items}
          getRowId={(a) => a.id}
          emptyState={<EmptyState title="Nenhum aviso concluído" />}
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

  const announcements = await container.useCases.listAllActiveAnnouncements.execute(
    session.authContext,
  );

  const columns: DataTableColumn<Announcement>[] = [
    {
      key: 'titulo',
      header: 'Título',
      cell: (a) => <span className="font-medium">{a.titulo}</span>,
    },
    {
      key: 'prioridade',
      header: 'Prioridade',
      cell: (a) => <Badge variant={PRIORITY_VARIANT[a.prioridade]}>{a.prioridade}</Badge>,
    },
    { key: 'destaque', header: 'Destaque', cell: (a) => (a.destacar ? 'Sim' : '—') },
    {
      key: 'status',
      header: 'Status',
      cell: (a) => (
        <Badge variant={a.publicado ? 'success' : 'outline'}>
          {a.publicado ? 'publicado' : 'rascunho'}
        </Badge>
      ),
    },
    {
      key: 'acoes',
      header: '',
      cell: (a) => (
        <div className="flex items-center justify-end gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`${BASE_PATH}/${a.id}`}>Editar</Link>
          </Button>
          <PublishToggleButton
            published={a.publicado}
            onToggle={toggleAnnouncementPublishedAction.bind(null, a.id)}
          />
          <DeleteButton
            action={deleteAnnouncementAction.bind(null, a.id)}
            confirmMessage={`Excluir "${a.titulo}"? Fica registrado em Concluídos.`}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Avisos</h1>
        <Button asChild>
          <Link href={`${BASE_PATH}/novo`}>Novo Aviso</Link>
        </Button>
      </div>

      <ConcludedTabNav basePath={BASE_PATH} aba="principal" />

      <DataTable
        columns={columns}
        rows={announcements}
        getRowId={(a) => a.id}
        emptyState={
          <EmptyState
            title="Nenhum aviso cadastrado"
            action={
              <Button asChild size="sm">
                <Link href={`${BASE_PATH}/novo`}>Novo Aviso</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
