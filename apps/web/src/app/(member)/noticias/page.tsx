import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveHeroPhoto } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHero,
} from '@vl6/ui';
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
  // Página pública (papel Visitante, sem sessão) — sem controle de foto
  // aqui, já que não há como checar `tenant:manage` sem sessão. Uma foto já
  // configurada em `Tenant.heroPhotos['noticias']` por outra rota continua
  // aparecendo normalmente (só leitura).
  const heroPhoto = resolveHeroPhoto(current.tenant, 'noticias');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-12">
      <PageHero
        kicker={current.tenant.nome}
        title="Notícias"
        photoUrl={heroPhoto?.url}
        photoPosicao={heroPhoto?.posicao}
      />
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
