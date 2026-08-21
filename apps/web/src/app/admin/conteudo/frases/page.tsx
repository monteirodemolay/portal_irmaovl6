import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { InspirationalQuote } from '@vl6/domain';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  Pagination,
  type DataTableColumn,
} from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import {
  deleteInspirationalQuoteAction,
  hardDeleteInspirationalQuoteAction,
  toggleInspirationalQuoteActiveAction,
} from '@/modules/content/actions/content-actions';
import { QuoteRotationForm } from '@/modules/content/components/quote-rotation-form';
import { PublishToggleButton } from '@/components/admin/publish-toggle-button';
import { DeleteButton } from '@/components/admin/delete-button';
import { ConcludedTabNav } from '@/components/admin/concluded-tab-nav';

const BASE_PATH = '/admin/conteudo/frases';
const PAGE_SIZE = 20;

export default async function InspirationalQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; cursor?: string }>;
}) {
  const session = await requirePagePermission('quote:read');
  const { aba, cursor } = await searchParams;
  const isConcluded = aba === 'concluidos';

  const container = createServerContainer();

  if (isConcluded) {
    const page = await container.useCases.listConcludedInspirationalQuotes.execute(
      session.authContext,
      { cursor, limit: PAGE_SIZE },
    );

    const columns: DataTableColumn<InspirationalQuote>[] = [
      {
        key: 'texto',
        header: 'Frase',
        cell: (q) => <span className="line-clamp-2 font-medium">{q.texto}</span>,
      },
      { key: 'autor', header: 'Autor', cell: (q) => q.autor },
      { key: 'status', header: 'Status', cell: (q) => (q.deletedAt ? 'excluída' : 'inativa') },
      {
        key: 'acoes',
        header: '',
        cell: (q) => (
          <DeleteButton
            action={hardDeleteInspirationalQuoteAction.bind(null, q.id)}
            confirmMessage="Excluir esta frase definitivamente? Não tem como desfazer."
            label="Excluir permanentemente"
            variant="destructive"
          />
        ),
      },
    ];

    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-semibold">Frases</h1>
        <ConcludedTabNav basePath={BASE_PATH} aba="concluidos" />
        <DataTable
          columns={columns}
          rows={page.items}
          getRowId={(q) => q.id}
          emptyState={<EmptyState title="Nenhuma frase concluída" />}
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

  const [quotes, current] = await Promise.all([
    container.useCases.listActiveInspirationalQuotes.execute(session.authContext),
    getCurrentTenant(),
  ]);

  const columns: DataTableColumn<InspirationalQuote>[] = [
    {
      key: 'texto',
      header: 'Frase',
      cell: (q) => <span className="line-clamp-2 font-medium">{q.texto}</span>,
    },
    { key: 'autor', header: 'Autor', cell: (q) => q.autor },
    {
      key: 'status',
      header: 'Status',
      cell: (q) => (
        <Badge variant={q.ativa ? 'success' : 'outline'}>{q.ativa ? 'ativa' : 'inativa'}</Badge>
      ),
    },
    {
      key: 'acoes',
      header: '',
      cell: (q) => (
        <div className="flex items-center justify-end gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`${BASE_PATH}/${q.id}`}>Editar</Link>
          </Button>
          <PublishToggleButton
            published={q.ativa}
            onToggle={toggleInspirationalQuoteActiveAction.bind(null, q.id)}
            labels={{ on: 'Ativar', off: 'Desativar' }}
          />
          <DeleteButton
            action={deleteInspirationalQuoteAction.bind(null, q.id)}
            confirmMessage="Excluir esta frase? Fica registrada em Concluídos."
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Frases</h1>
        <Button asChild>
          <Link href={`${BASE_PATH}/nova`}>Nova Frase</Link>
        </Button>
      </div>

      <ConcludedTabNav basePath={BASE_PATH} aba="principal" />

      <Card>
        <CardHeader>
          <CardTitle>Rotação da frase do dia</CardTitle>
        </CardHeader>
        <CardContent>
          <QuoteRotationForm
            modo={current?.settings?.citacaoRotacao?.modo ?? 'diaria'}
            intervaloMinutos={current?.settings?.citacaoRotacao?.intervaloMinutos ?? null}
          />
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={quotes}
        getRowId={(q) => q.id}
        emptyState={
          <EmptyState
            title="Nenhuma frase cadastrada"
            description="Enquanto isso, o Início exibe um banco de frases padrão."
            action={
              <Button asChild size="sm">
                <Link href={`${BASE_PATH}/nova`}>Nova Frase</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
