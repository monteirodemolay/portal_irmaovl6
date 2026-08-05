import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { Announcement } from '@vl6/domain';
import { Badge, Button, DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { toggleAnnouncementPublishedAction } from '@/modules/content/actions/content-actions';
import { PublishToggleButton } from '@/modules/content/components/publish-toggle-button';

const PRIORITY_VARIANT = { baixa: 'default', media: 'warning', alta: 'destructive' } as const;

export default async function AnnouncementsPage() {
  const session = await requirePagePermission('announcement:read');

  const container = createServerContainer();
  const announcements = await container.useCases.listAllAnnouncements.execute(session.authContext);

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
        <PublishToggleButton
          published={a.publicado}
          onToggle={toggleAnnouncementPublishedAction.bind(null, a.id)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Avisos</h1>
        <Button asChild>
          <Link href="/admin/avisos/novo">Novo Aviso</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={announcements}
        getRowId={(a) => a.id}
        emptyState={
          <EmptyState
            title="Nenhum aviso cadastrado"
            action={
              <Button asChild size="sm">
                <Link href="/admin/avisos/novo">Novo Aviso</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
