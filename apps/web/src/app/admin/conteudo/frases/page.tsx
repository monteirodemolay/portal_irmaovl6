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
  type DataTableColumn,
} from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { toggleInspirationalQuoteActiveAction } from '@/modules/content/actions/content-actions';
import { QuoteRotationForm } from '@/modules/content/components/quote-rotation-form';
import { PublishToggleButton } from '@/components/admin/publish-toggle-button';

export default async function InspirationalQuotesPage() {
  const session = await requirePagePermission('quote:read');

  const container = createServerContainer();
  const [quotes, current] = await Promise.all([
    container.useCases.listAllInspirationalQuotes.execute(session.authContext),
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
            <Link href={`/admin/conteudo/frases/${q.id}`}>Editar</Link>
          </Button>
          <PublishToggleButton
            published={q.ativa}
            onToggle={toggleInspirationalQuoteActiveAction.bind(null, q.id)}
            labels={{ on: 'Ativar', off: 'Desativar' }}
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
          <Link href="/admin/conteudo/frases/nova">Nova Frase</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rotação da frase do dia</CardTitle>
        </CardHeader>
        <CardContent>
          <QuoteRotationForm
            modo={current?.settings?.citacaoRotacao.modo ?? 'diaria'}
            intervaloMinutos={current?.settings?.citacaoRotacao.intervaloMinutos ?? null}
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
                <Link href="/admin/conteudo/frases/nova">Nova Frase</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
