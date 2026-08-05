import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  toggleNewsPublishedAction,
  updateNewsAction,
} from '@/modules/content/actions/content-actions';
import { NewsForm } from '@/modules/content/components/news-form';
import { PublishToggleButton } from '@/components/admin/publish-toggle-button';

export default async function EditNewsPage({ params }: { params: Promise<{ newsId: string }> }) {
  const session = await requirePagePermission('news:update');
  const { newsId } = await params;

  const container = createServerContainer();
  const news = await container.repositories.news.findById(newsId);
  if (!news || news.tenantId !== session.authContext.tenantId) notFound();

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
    </div>
  );
}
