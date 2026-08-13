import { notFound } from 'next/navigation';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { Card, CardHeader, CardTitle, CardContent } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  toggleNewsPublishedAction,
  updateNewsAction,
} from '@/modules/content/actions/content-actions';
import { NewsForm } from '@/modules/content/components/news-form';
import { ModerateCommentsPanel } from '@/modules/content/components/moderate-comments-panel';
import { PublishToggleButton } from '@/components/admin/publish-toggle-button';

export default async function EditNewsPage({ params }: { params: Promise<{ newsId: string }> }) {
  const session = await requirePagePermission('news:update');
  const { newsId } = await params;

  const container = createServerContainer();
  const news = await container.repositories.news.findById(newsId);
  if (!news || news.tenantId !== session.authContext.tenantId) notFound();

  const canModerate = hasPermission(session.authContext, 'news:manage');
  const pendingComments = canModerate
    ? (await container.useCases.listPendingNewsComments.execute(session.authContext)).filter(
        (comment) => comment.newsId === newsId,
      )
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">{news.titulo}</h1>
        <PublishToggleButton
          published={news.publicado}
          onToggle={toggleNewsPublishedAction.bind(null, news.id)}
        />
      </div>
      <NewsForm action={updateNewsAction.bind(null, newsId)} news={news} />

      {canModerate && (
        <Card>
          <CardHeader>
            <CardTitle>Comentários pendentes de moderação</CardTitle>
          </CardHeader>
          <CardContent>
            <ModerateCommentsPanel newsId={newsId} comments={pendingComments} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
