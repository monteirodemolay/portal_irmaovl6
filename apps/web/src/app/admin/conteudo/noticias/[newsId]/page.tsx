import { notFound } from 'next/navigation';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { Button, Card, CardHeader, CardTitle, CardContent, Textarea } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  deleteNewsAction,
  toggleNewsPublishedAction,
  updateNewsAction,
} from '@/modules/content/actions/content-actions';
import { updateNewsInstagramLinksAction } from '@/modules/content/actions/news-instagram-actions';
import { NewsForm } from '@/modules/content/components/news-form';
import { ModerateCommentsPanel } from '@/modules/content/components/moderate-comments-panel';
import { resolveCommentAuthorNames } from '@/modules/content/lib/resolve-comment-authors';
import { PublishToggleButton } from '@/components/admin/publish-toggle-button';
import { DeleteButton } from '@/components/admin/delete-button';

export default async function EditNewsPage({ params }: { params: Promise<{ newsId: string }> }) {
  const session = await requirePagePermission('news:update');
  const { newsId } = await params;

  const container = createServerContainer();
  const news = await container.repositories.news.findById(newsId);
  if (!news || news.tenantId !== session.authContext.tenantId) notFound();

  const eventsPage = await container.useCases.listAllEvents.execute(session.authContext, {
    limit: 500,
  });
  const eventOptions = eventsPage.items.map((event) => ({
    id: event.id,
    titulo: event.titulo,
    dataInicio: event.dataInicio.toISOString(),
    local: event.local,
    tipo: event.tipo,
  }));

  const canModerate = hasPermission(session.authContext, 'news:manage');
  const pendingComments = canModerate
    ? (await container.useCases.listPendingNewsComments.execute(session.authContext)).filter(
        (comment) => comment.newsId === newsId,
      )
    : [];
  const commentAuthorNames = await resolveCommentAuthorNames(
    container,
    session.authContext.tenantId,
    pendingComments,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">{news.titulo}</h1>
        <div className="flex items-center gap-2">
          <PublishToggleButton
            published={news.publicado}
            onToggle={toggleNewsPublishedAction.bind(null, news.id)}
          />
          <DeleteButton
            action={deleteNewsAction.bind(null, newsId)}
            confirmMessage={`Excluir "${news.titulo}"? Fica registrado em Concluídos.`}
            redirectTo="/admin/conteudo/noticias"
          />
        </div>
      </div>

      <NewsForm action={updateNewsAction.bind(null, newsId)} news={news} events={eventOptions} />

      <Card>
        <CardHeader>
          <CardTitle>Publicações externas relacionadas</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateNewsInstagramLinksAction.bind(null, news.id)} className="max-w-4xl">
            <label htmlFor="instagramUrls" className="text-sm font-medium">
              Links do Instagram
            </label>
            <p className="text-muted mt-1 text-xs leading-relaxed">
              Informe um link por linha. Estes links ficam vinculados à notícia e, quando ela estiver
              relacionada a um Evento/Sessão, aparecem automaticamente também na memória desse
              acontecimento no Acervo VL6. Não é necessário cadastrar novamente no Evento.
            </p>
            <Textarea
              id="instagramUrls"
              name="instagramUrls"
              rows={4}
              className="mt-3"
              defaultValue={(news.instagramUrls ?? []).join('\n')}
              placeholder={'https://www.instagram.com/p/...\nhttps://www.instagram.com/reel/...'}
            />
            <p className="text-muted mt-2 text-[11px]">
              Aceita publicações e Reels do Instagram. Máximo de 10 links por notícia.
            </p>
            <Button type="submit" className="mt-3">
              Salvar links externos
            </Button>
          </form>
        </CardContent>
      </Card>

      {canModerate && (
        <Card>
          <CardHeader>
            <CardTitle>Comentários pendentes de moderação</CardTitle>
          </CardHeader>
          <CardContent>
            <ModerateCommentsPanel comments={pendingComments} authorNames={commentAuthorNames} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
