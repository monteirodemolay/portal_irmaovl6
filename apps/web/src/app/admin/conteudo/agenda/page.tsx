import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { hasPermission, type Event } from '@vl6/domain';
import {
  BRAZIL_TIME_ZONE,
  EVENT_KIND_LABELS,
  formatSessionName,
  SESSION_TYPE_LABELS,
} from '@vl6/shared';
import {
  AlertTriangle,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Pagination,
  type DataTableColumn,
} from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { deleteEventAction, hardDeleteEventAction } from '@/modules/agenda/actions/agenda-actions';
import { startPublicationFromEventAction } from '@/modules/communication/actions/communication-actions';
import { DeleteButton } from '@/components/admin/delete-button';
import { ConcludedTabNav } from '@/components/admin/concluded-tab-nav';

const BASE_PATH = '/admin/conteudo/agenda';
const PAGE_SIZE = 20;

/** Nome estruturado quando a Sessão já foi classificada; cai no rótulo genérico do Tipo de Evento senão. */
function sessionOrKindLabel(event: Event): string {
  if (event.tipo === 'sessao' && event.sessionType && event.sessionNature) {
    return formatSessionName({
      sessionType: event.sessionType,
      sessionNature: event.sessionNature,
      access: event.access ?? null,
    });
  }
  return EVENT_KIND_LABELS[event.tipo];
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: BRAZIL_TIME_ZONE,
  }).format(new Date(date));
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; cursor?: string }>;
}) {
  const session = await requirePagePermission('event:read');
  const { aba, cursor } = await searchParams;
  const isConcluded = aba === 'concluidos';

  const container = createServerContainer();

  if (isConcluded) {
    const page = await container.useCases.listConcludedEvents.execute(session.authContext, {
      cursor,
      limit: PAGE_SIZE,
    });

    const columns: DataTableColumn<Event>[] = [
      { key: 'titulo', header: 'Evento', cell: (event) => event.titulo },
      { key: 'inicio', header: 'Início', cell: (event) => formatDateTime(event.dataInicio) },
      {
        key: 'status',
        header: 'Status',
        cell: (event) => (event.deletedAt ? 'excluído' : 'passado'),
      },
      {
        key: 'acoes',
        header: '',
        cell: (event) => (
          <DeleteButton
            action={hardDeleteEventAction.bind(null, event.id)}
            confirmMessage={`Excluir "${event.titulo}" definitivamente? Não tem como desfazer.`}
            label="Excluir permanentemente"
            variant="destructive"
          />
        ),
      },
    ];

    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-semibold">Agenda / Eventos</h1>
        <ConcludedTabNav basePath={BASE_PATH} aba="concluidos" />
        <DataTable
          columns={columns}
          rows={page.items}
          getRowId={(event) => event.id}
          emptyState={<EmptyState title="Nenhum evento concluído" />}
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

  const page = await container.useCases.listUpcomingEvents.execute(session.authContext, {
    limit: 50,
  });

  const columns: DataTableColumn<Event>[] = [
    {
      key: 'titulo',
      header: 'Evento',
      cell: (event) => (
        <Link href={`${BASE_PATH}/${event.id}`} className="font-medium hover:underline">
          {event.titulo}
        </Link>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      cell: (event) => (
        <div className="flex flex-col gap-1">
          <span>{sessionOrKindLabel(event)}</span>
          {event.tipo === 'sessao' && event.sessionType && (
            <span className="text-muted text-xs">{SESSION_TYPE_LABELS[event.sessionType]}</span>
          )}
          {event.tipo === 'sessao' && event.classificationReviewRequired && (
            <Badge variant="warning" className="w-fit">
              <AlertTriangle size={12} className="mr-1 inline" />
              Revisão pendente
            </Badge>
          )}
        </div>
      ),
    },
    { key: 'local', header: 'Local', cell: (event) => event.local },
    { key: 'inicio', header: 'Início', cell: (event) => formatDateTime(event.dataInicio) },
    {
      key: 'confirmacao',
      header: 'Confirmação',
      cell: (event) => (event.exigeConfirmacaoPresenca ? 'Sim' : '—'),
    },
    {
      key: 'acoes',
      header: '',
      cell: (event) => (
        <div className="flex items-center justify-end gap-2">
          {event.tipo === 'sessao' &&
            hasPermission(session.authContext, 'communication:manage') && (
              <form action={startPublicationFromEventAction.bind(null, event.id)}>
                <Button type="submit" variant="outline" size="sm">
                  Gerar arte
                </Button>
              </form>
            )}
          <Button asChild variant="outline" size="sm">
            <Link href={`${BASE_PATH}/${event.id}/editar`}>Editar</Link>
          </Button>
          <DeleteButton
            action={deleteEventAction.bind(null, event.id)}
            confirmMessage={`Excluir "${event.titulo}"? Fica registrado em Concluídos.`}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Agenda / Eventos</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`${BASE_PATH}/classificacao-migracao`}>Classificar Sessões</Link>
          </Button>
          <Button asChild>
            <Link href={`${BASE_PATH}/novo`}>Novo Evento</Link>
          </Button>
        </div>
      </div>

      <ConcludedTabNav basePath={BASE_PATH} aba="principal" />

      <DataTable
        columns={columns}
        rows={page.items}
        getRowId={(event) => event.id}
        emptyState={
          <EmptyState
            title="Nenhum evento cadastrado"
            action={
              <Button asChild size="sm">
                <Link href={`${BASE_PATH}/novo`}>Novo Evento</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
