import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { Badge } from '@vl6/ui';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { NewsCommentForm } from '@/modules/content/components/news-comment-form';
import { NewsImageGallery } from '@/modules/content/components/news-image-gallery';

function formatDate(date: Date | null): string {
  return date
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(date))
    : '';
}

function readingTime(html: string): number {
  const words = html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function splitNewsGallery(html: string): { bodyHtml: string; images: string[] } {
  const galleryMatch = html.match(/<div data-news-gallery="true">([\s\S]*?)<\/div>/i);
  if (!galleryMatch) return { bodyHtml: html, images: [] };

  const images: string[] = [];
  const galleryHtml = galleryMatch[1] ?? '';
  for (const match of galleryHtml.matchAll(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/gi)) {
    if (match[2]) images.push(match[2].replace(/&amp;/g, '&'));
  }

  return {
    bodyHtml: html.replace(galleryMatch[0], '').trim(),
    images: [...new Set(images)],
  };
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

  await container.repositories.news.incrementViews(news.id).catch(() => undefined);

  const [comments, session, relatedPage] = await Promise.all([
    container.repositories.newsComment.listApprovedByNews(news.id),
    getCurrentSession(),
    container.useCases.listPublishedNews.execute(current.tenant.id, { limit: 12 }),
  ]);

  const related = relatedPage.items
    .filter((item) => item.id !== news.id && item.categoria === news.categoria)
    .slice(0, 3);
  const { bodyHtml, images: galleryImages } = splitNewsGallery(news.conteudoHtml);

  return (
    <article className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/noticias" className="text-primary text-sm font-medium hover:underline">
        ← Voltar para Notícias
      </Link>

      <div className="mt-5 grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0">
          <header className="mx-auto max-w-4xl">
            <div className="flex flex-wrap gap-2">
              <Badge variant="accent">{news.categoria}</Badge>
              {news.destaquePrincipal && <Badge variant="outline">Destaque principal</Badge>}
              {!news.destaquePrincipal && news.destaque && <Badge variant="outline">Destaque</Badge>}
            </div>

            <h1 className="font-display mt-4 text-balance text-4xl font-semibold leading-tight sm:text-5xl">
              {news.titulo}
            </h1>
            {news.subtitulo && (
              <p className="text-muted mt-4 text-lg leading-relaxed">{news.subtitulo}</p>
            )}

            <div className="text-muted mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span>{formatDate(news.dataPublicacao)}</span>
              <span>{readingTime(news.conteudoHtml)} min de leitura</span>
              <span>{news.contagemVisualizacoes + 1} visualizações</span>
            </div>
          </header>

          {news.imagemCapaUrl && (
            <img
              src={news.imagemCapaUrl}
              alt={news.titulo}
              className="mx-auto mt-7 max-h-[560px] w-full max-w-5xl rounded-2xl object-cover"
            />
          )}

          <div
            className="prose prose-slate mx-auto mt-8 max-w-3xl prose-headings:font-display prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />

          <NewsImageGallery images={galleryImages} title={news.titulo} />

          <div className="border-border mx-auto mt-10 max-w-3xl border-t pt-7">
            <h2 className="font-display text-2xl font-semibold">Comentários</h2>
            {comments.length === 0 ? (
              <p className="text-muted mt-3 text-sm">Nenhum comentário ainda.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {comments.map((comment) => (
                  <li key={comment.id} className="border-border bg-surface rounded-lg border p-4 text-sm">
                    {comment.texto}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4">
              {session ? (
                <NewsCommentForm newsId={news.id} slug={slug} />
              ) : (
                <p className="text-muted text-sm">
                  Faça login como Irmão para comentar nesta notícia.
                </p>
              )}
            </div>
          </div>
        </main>

        <aside className="xl:pt-3">
          <div className="border-border bg-surface sticky top-6 rounded-xl border p-4">
            <h2 className="font-display text-lg font-semibold">Leia também</h2>
            {related.length === 0 ? (
              <p className="text-muted mt-3 text-sm">Não há outras matérias desta editoria.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-4">
                {related.map((item) => (
                  <Link key={item.id} href={`/noticias/${item.slug}`} className="group">
                    {item.imagemCapaUrl && (
                      <img src={item.imagemCapaUrl} alt="" className="h-28 w-full rounded-lg object-cover" />
                    )}
                    <p className="text-muted mt-2 text-xs">{formatDate(item.dataPublicacao)}</p>
                    <p className="font-display mt-1 font-semibold leading-snug group-hover:underline">
                      {item.titulo}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}
