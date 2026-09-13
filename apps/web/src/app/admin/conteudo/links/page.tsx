import NextLink from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { Link, LinkSuggestion } from '@vl6/domain';
import { LINK_ACCESS_TYPE_LABELS, LINK_CATEGORY_LABELS } from '@vl6/shared';
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
import { setLinkActiveAction } from '@/modules/notification/actions/link-admin-actions';
import { MoveLinkButtons } from '@/modules/notification/components/move-link-buttons';
import { ApproveSuggestionButton } from '@/modules/notification/components/approve-suggestion-button';
import { RejectSuggestionForm } from '@/modules/notification/components/reject-suggestion-form';
import { PublishToggleButton } from '@/components/admin/publish-toggle-button';

const BASE_PATH = '/admin/conteudo/links';

export default async function LinksPage() {
  const session = await requirePagePermission('link:read');

  const container = createServerContainer();
  const [links, suggestions] = await Promise.all([
    container.repositories.link.listAll(session.authContext.tenantId),
    container.useCases.listPendingLinkSuggestions.execute(session.authContext),
  ]);

  const ordered = [...links].sort((a, b) => a.ordem - b.ordem);

  const columns: DataTableColumn<Link>[] = [
    {
      key: 'titulo',
      header: 'Título',
      cell: (l) => (
        <div className="flex flex-col">
          <span className="font-medium">{l.titulo}</span>
          <span className="text-muted line-clamp-1 text-xs">{l.url}</span>
        </div>
      ),
    },
    { key: 'categoria', header: 'Categoria', cell: (l) => LINK_CATEGORY_LABELS[l.categoria] },
    { key: 'tipoAcesso', header: 'Tipo', cell: (l) => LINK_ACCESS_TYPE_LABELS[l.tipoAcesso] },
    {
      key: 'destaque',
      header: 'Destaque',
      cell: (l) => (l.destaque ? <Badge variant="accent">destaque</Badge> : null),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (l) => (
        <Badge variant={l.ativo ? 'success' : 'outline'}>{l.ativo ? 'ativo' : 'inativo'}</Badge>
      ),
    },
    {
      key: 'acoes',
      header: '',
      cell: (l) => (
        <div className="flex items-center justify-end gap-2">
          <MoveLinkButtons
            linkId={l.id}
            disableUp={ordered.indexOf(l) === 0}
            disableDown={ordered.indexOf(l) === ordered.length - 1}
          />
          <Button asChild variant="outline" size="sm">
            <NextLink href={`${BASE_PATH}/${l.id}`}>Editar</NextLink>
          </Button>
          <PublishToggleButton
            published={l.ativo}
            onToggle={setLinkActiveAction.bind(null, l.id)}
            labels={{ on: 'Ativar', off: 'Desativar' }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Links Úteis</h1>
        <Button asChild>
          <NextLink href={`${BASE_PATH}/novo`}>Novo Link</NextLink>
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={ordered}
        getRowId={(l) => l.id}
        emptyState={
          <EmptyState
            title="Nenhum link cadastrado"
            action={
              <Button asChild size="sm">
                <NextLink href={`${BASE_PATH}/novo`}>Novo Link</NextLink>
              </Button>
            }
          />
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Sugestões pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <p className="text-muted text-sm">Nenhuma sugestão aguardando revisão.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {suggestions.map((s: LinkSuggestion) => (
                <li
                  key={s.id}
                  className="border-border flex flex-col gap-2 border-b pb-4 last:border-0"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{s.titulo}</span>
                    <span className="text-muted line-clamp-1 text-xs">{s.url}</span>
                    {s.descricao && <span className="text-muted text-sm">{s.descricao}</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <NextLink
                        href={`${BASE_PATH}/novo?titulo=${encodeURIComponent(s.titulo)}&url=${encodeURIComponent(s.url)}&descricao=${encodeURIComponent(s.descricao ?? '')}`}
                      >
                        Criar link a partir desta sugestão
                      </NextLink>
                    </Button>
                    <ApproveSuggestionButton suggestionId={s.id} />
                    <RejectSuggestionForm suggestionId={s.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
