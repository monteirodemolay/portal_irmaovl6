import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from '@vl6/ui';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

function formatDate(date: Date | null): string {
  return date ? new Intl.DateTimeFormat('pt-BR').format(new Date(date)) : '';
}

/** Notícias publicadas são conteúdo público — o papel Visitante tem `news:read` (docs/architecture/08 §8.2). */
export default async function PublicNewsPage() {
  const current = await getCurrentTenant();
  if (!current) notFound();

  const container = createServerContainer();
  const page = await container.useCases.listPublishedNews.execute(current.tenant.id, { limit: 20 });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <h1 className="font-display text-2xl font-semibold">Notícias</h1>
      {page.items.length === 0 ? (
        <EmptyState title="Nenhuma notícia publicada ainda" />
      ) : (
        <div className="flex flex-col gap-3">
          {page.items.map((news) => (
            <Link key={news.id} href={`/noticias/${news.slug}`}>
              <Card className="hover:border-accent transition-colors">
                <CardHeader>
                  <CardTitle>{news.titulo}</CardTitle>
                  {news.subtitulo && <CardDescription>{news.subtitulo}</CardDescription>}
                </CardHeader>
                <CardContent className="text-muted flex items-center justify-between text-xs">
                  <span>{news.categoria}</span>
                  <span>{formatDate(news.dataPublicacao)}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
