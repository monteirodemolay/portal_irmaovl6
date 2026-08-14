import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { Event } from '@vl6/domain';
import { EVENT_KIND_LABELS } from '@vl6/shared';
import { Button, DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(date),
  );
}

export default async function AgendaPage() {
  const session = await requirePagePermission('event:read');

  const container = createServerContainer();
  const page = await container.useCases.listAllEvents.execute(session.authContext, { limit: 50 });

  const columns: DataTableColumn<Event>[] = [
    {
      key: 'titulo',
      header: 'Evento',
      cell: (event) => (
        <Link href={`/admin/conteudo/agenda/${event.id}`} className="font-medium hover:underline">
          {event.titulo}
        </Link>
      ),
    },
    { key: 'tipo', header: 'Tipo', cell: (event) => EVENT_KIND_LABELS[event.tipo] },
    { key: 'local', header: 'Local', cell: (event) => event.local },
    { key: 'inicio', header: 'Início', cell: (event) => formatDateTime(event.dataInicio) },
    {
      key: 'confirmacao',
      header: 'Confirmação',
      cell: (event) => (event.exigeConfirmacaoPresenca ? 'Sim' : '—'),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Agenda / Eventos</h1>
        <Button asChild>
          <Link href="/admin/conteudo/agenda/novo">Novo Evento</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={page.items}
        getRowId={(event) => event.id}
        emptyState={
          <EmptyState
            title="Nenhum evento cadastrado"
            action={
              <Button asChild size="sm">
                <Link href="/admin/conteudo/agenda/novo">Novo Evento</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
