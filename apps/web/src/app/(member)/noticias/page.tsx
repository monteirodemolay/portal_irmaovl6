import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveHeroPhoto, type News } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { Badge, EmptyState, PageHero } from '@vl6/ui';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

function formatDate(date: Date | null): string {
  return date
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(date))
    : '';
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function excerpt(news: News, max = 180): string {
  const value = news.subtitulo?.trim() || stripHtml(news.conteudoHtml);
  return value.length > max ? `${value.slice(0, max).trim()}…` : value;
}

function readingTime(news: News): number {
  const words = stripHtml(news.conteudoHtml).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function buildHref(category: string | null, query: string): string {
  const params = new URLSearchParams();
  if (category) params.set('categoria', category);
  if (query) params.set('q', query);
  const suffix = params.toString();
  return suffix ? `/noticias?${suffix}` : '/noticias';
}

export default async function PublicNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; q?: string }>;
}) {
  const current = await getCurrentTenant();
  if (!current) notFound();

  const params = await searchParams;
  const selectedCategory = params.categoria?.trim() || null;
  const query = params.q?.trim() || '';

  const container = createServerContainer();
  const page = await container.useCases.listPublishedNews.execute(current.tenant.id, { limit: 100 });
  const heroPhoto = resolveHeroPhoto(current.tenant, 'noticias');

  const allNews = page.items;
  const categories = [...new Set(allNews.map((item) => item.categoria).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );

  const normalizedQuery = query.toLocaleLowerCase('pt-BR');
  const filtered = allNews.filter((item) => {
    if (selectedCategory && item.categoria !== selectedCategory) return false;
    if (!normalizedQuery) return true;
    const haystack = `${item.titulo} ${item.subtitulo ?? ''} ${stripHtml(item.conteudoHtml)}`.toLocaleLowerCase(
      'pt-BR',
    );
    return haystack.includes(normalizedQuery);
  });

  const editorialPool = selectedCategory || query ? filtered : allNews;
  const primary =
    editorialPool.find((item) => Boolean(item.destaquePrincipal)) ??
    editorialPool.find((item) => Boolean(item.destaque)) ??
    editorialPool[0] ??
    null;

  const featured = editorialPool
    .filter((item) => item.id !== primary?.id && Boolean(item.destaque))
    .slice(0, 3);

  const latest = filtered.filter((item) => item.id !== primary?.id).slice(0, 12);
  const mostRead = [...allNews]
    .sort((a, b) => b.contagemVisualizacoes - a.contagemVisualizacoes)
    .slice(0, 5);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHero
        kicker={current.tenant.nome}
        title="Notícias"
        description="Informação, memória e acontecimentos da Verdadeira Luz nº 06."
        photoUrl={heroPhoto?.url}
        photoPosicao={heroPhoto?.posicao}
      />

      <form action="/noticias" method="get" className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="border-border bg-surface flex flex-1 items-center rounded-xl border px-4">
          <span className="text-muted mr-2 text-sm" aria-hidden="true">
            ⌕
          </span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Pesquisar notícias, sessões, irmãos ou temas..."
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
          {selectedCategory && <input type="hidden" name="categoria" value={selectedCategory} />}
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground h-11 rounded-xl px-5 text-sm font-semibold"
        >
          Pesquisar
        </button>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Link
          href={buildHref(null, query)}
          className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors ${
            !selectedCategory ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-surface'
          }`}
        >
          Todas
        </Link>
        {categories.map((category) => (
          <Link
            key={category}
            href={buildHref(category, query)}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors ${
              selectedCategory === category
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border bg-surface'
            }`}
          >
            {category}
          </Link>
        ))}
      </div>

      {filtered.length === 0 || !primary ? (
        <EmptyState title="Nenhuma notícia encontrada" />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
          <main className="min-w-0">
            <Link
              href={`/noticias/${primary.slug}`}
              className="group relative block min-h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 sm:min-h-[430px]"
            >
              {primary.imagemCapaUrl ? (
                <img
                  src={primary.imagemCapaUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="from-primary absolute inset-0 bg-gradient-to-br to-slate-950" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge variant="default">
                    {primary.destaquePrincipal ? 'Destaque principal' : 'Destaque'}
                  </Badge>
                  <Badge variant="outline" className="border-white/30 bg-black/20 text-white">
                    {primary.categoria}
                  </Badge>
                </div>
                <h1 className="font-display max-w-4xl text-balance text-3xl font-semibold leading-tight text-white sm:text-4xl">
                  {primary.titulo}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/80 sm:text-base">
                  {excerpt(primary, 220)}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70">
                  <span>{formatDate(primary.dataPublicacao)}</span>
                  <span>{readingTime(primary)} min de leitura</span>
                  <span>{primary.contagemVisualizacoes} visualizações</span>
                </div>
              </div>
            </Link>

            {featured.length > 0 && (
              <section className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold">Destaques</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {featured.map((item) => (
                    <Link
                      key={item.id}
                      href={`/noticias/${item.slug}`}
                      className="border-border bg-surface group overflow-hidden rounded-xl border"
                    >
                      {item.imagemCapaUrl ? (
                        <img src={item.imagemCapaUrl} alt="" className="h-36 w-full object-cover" />
                      ) : (
                        <div className="from-primary h-36 bg-gradient-to-br to-slate-900" />
                      )}
                      <div className="p-4">
                        <p className="text-muted text-xs">
                          {item.categoria} · {formatDate(item.dataPublicacao)}
                        </p>
                        <h3 className="font-display mt-1 line-clamp-3 font-semibold leading-snug group-hover:underline">
                          {item.titulo}
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-2xl font-semibold">Últimas notícias</h2>
                {(selectedCategory || query) && (
                  <Link href="/noticias" className="text-primary text-sm hover:underline">
                    Limpar filtros
                  </Link>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {latest.map((item) => (
                  <Link
                    key={item.id}
                    href={`/noticias/${item.slug}`}
                    className="border-border bg-surface group grid gap-4 rounded-xl border p-3 sm:grid-cols-[180px_minmax(0,1fr)]"
                  >
                    {item.imagemCapaUrl ? (
                      <img
                        src={item.imagemCapaUrl}
                        alt=""
                        className="h-32 w-full rounded-lg object-cover"
                      />
                    ) : (
                      <div className="from-primary h-32 rounded-lg bg-gradient-to-br to-slate-900" />
                    )}
                    <div className="min-w-0 py-1">
                      <p className="text-accent text-xs font-semibold uppercase tracking-wide">
                        {item.categoria}
                      </p>
                      <h3 className="font-display mt-1 text-lg font-semibold leading-snug group-hover:underline">
                        {item.titulo}
                      </h3>
                      <p className="text-muted mt-2 line-clamp-2 text-sm">{excerpt(item)}</p>
                      <div className="text-muted mt-3 flex gap-3 text-xs">
                        <span>{formatDate(item.dataPublicacao)}</span>
                        <span>{readingTime(item)} min de leitura</span>
                        <span>{item.contagemVisualizacoes} visualizações</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </main>

          <aside className="flex flex-col gap-4">
            <section className="border-border bg-surface rounded-xl border p-4">
              <h2 className="font-display text-lg font-semibold">Mais lidas</h2>
              <ol className="mt-3 flex flex-col gap-3">
                {mostRead.map((item, index) => (
                  <li key={item.id}>
                    <Link href={`/noticias/${item.slug}`} className="group flex gap-3">
                      <span className="bg-accent text-accent-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-sm font-semibold leading-snug group-hover:underline">
                          {item.titulo}
                        </span>
                        <span className="text-muted mt-1 block text-xs">
                          {item.contagemVisualizacoes} visualizações
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>

            <section className="border-border bg-surface rounded-xl border p-4">
              <h2 className="font-display text-lg font-semibold">Editorias</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Link
                    key={category}
                    href={buildHref(category, '')}
                    className="border-border hover:border-primary rounded-full border px-3 py-1.5 text-xs transition-colors"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </section>

            <section className="border-border bg-surface rounded-xl border p-4">
              <h2 className="font-display text-lg font-semibold">Sobre esta área</h2>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                Reúne publicações institucionais, sessões, ações sociais, registros históricos e
                acontecimentos ligados à Verdadeira Luz nº 06.
              </p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
