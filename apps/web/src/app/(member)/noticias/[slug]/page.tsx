import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { NewsCommentForm } from '@/modules/content/components/news-comment-form';

function formatDate(date: Date | null): string {
  return date ? new Intl.DateTimeFormat('pt-BR').format(new Date(date)) : '';
}

export default async function PublicNewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const current = await getCurrentTenant();
  if (!current) notFound();
  const { slug } = await params;

  const container = createServerContainer();
  const news = await container.repositories.news.findPublishedBySlug(current.tenant.id, slug);
  if (!news) notFound();

  const [comments, session] = await Promise.all([
    container.repositories.newsComment.listApprovedByNews(news.id),
    getCurrentSession(),
  ]);

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-12">
      <div>
        <p className="text-muted font-mono text-xs uppercase">
          {news.categoria} · {formatDate(news.dataPublicacao)}
        </p>
        <h1 className="font-display text-balance text-3xl font-semibold">{news.titulo}</h1>
        {news.subtitulo && <p className="text-muted mt-1">{news.subtitulo}</p>}
      </div>
      {news.imagemCapaUrl && (
        <img src={news.imagemCapaUrl} alt={news.titulo} className="rounded-lg" />
      )}
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: news.conteudoHtml }} />

      <div className="border-border mt-6 flex flex-col gap-4 border-t pt-6">
        <h2 className="font-display text-lg font-semibold">Comentários</h2>
        {comments.length === 0 ? (
          <p className="text-muted text-sm">Nenhum comentário ainda.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((comment) => (
              <li key={comment.id} className="border-border rounded border p-3 text-sm">
                {comment.texto}
              </li>
            ))}
          </ul>
        )}
        {session ? (
          <NewsCommentForm newsId={news.id} slug={slug} />
        ) : (
          <p className="text-muted text-sm">Faça login como Irmão para comentar nesta notícia.</p>
        )}
      </div>
    </article>
  );
}
