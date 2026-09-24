import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasPermission, resolveHeroPhoto, type News } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { Badge, EmptyState, PageHero } from '@vl6/ui';
import { PageHeroPhotoUpload } from '@/components/member/page-hero-photo-upload';
import { requireSession } from '@/lib/auth/require-session';
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

const PAGE_SIZE = 8;

function buildHref({
  category,
  query,
  year,
  page,
}: {
  category: string | null;
  query: string;
  year: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (category) params.set('categoria', category);
  if (query) params.set('q', query);
  if (year) params.set('ano', year);
  if (page && page > 1) params.set('pagina', String(page));
  const suffix = params.toString();
  return suffix ? `/noticias?${suffix}` : '/noticias';
}

export default async function PublicNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; q?: string; ano?: string; pagina?: string }>;
}) {
  const [session, current] = await Promise.all([requireSession(), getCurrentTenant()]);
  if (!current) notFound();

  const params = await searchParams;
  const selectedCategory = params.categoria?.trim() || null;
  const query = params.q?.trim() || '';
  const selectedYear = /^\d{4}$/.test(params.ano ?? '') ? params.ano! : '';
  const requestedPage = Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1);

  const container = createServerContainer();
  const page = await container.useCases.listPublishedNews.execute(current.tenant.id, { limit: 500 });
  const heroPhoto = resolveHeroPhoto(current.tenant, 'noticias');
  const canManageHeroPhoto = hasPermission(session.authContext, 'tenant:manage');

  const allNews = page.items;
  const categories = [...new Set(allNews.map((item) => item.categoria).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  );
  const years = [
    ...new Set(
      allNews
        .map((item) => item.dataPublicacao?.getFullYear())
        .filter((year): year is number => typeof year === 'number'),
    ),
  ].sort((a, b) => b - a);

  const normalizedQuery = query.toLocaleLowerCase('pt-BR');
  const filtered = allNews.filter((item) => {
    if (selectedCategory && item.categoria !== selectedCategory) return false;
    if (selectedYear && String(item.dataPublicacao?.getFullYear() ?? '') !== selectedYear) return false;
    if (!normalizedQuery) return true;
    const haystack = `${item.titulo} ${item.subtitulo ?? ''} ${stripHtml(item.conteudoHtml)}`.toLocaleLowerCase(
      'pt-BR',
    );
    return haystack.includes(normalizedQuery);
  });

  const editorialPool = selectedCategory || query || selectedYear ? filtered : allNews;
  const primary =
    editorialPool.find((item) => Boolean(item.destaquePrincipal)) ??
    editorialPool.find((item) => Boolean(item.destaque)) ??
    editorialPool[0] ??
    null;

  const featured = editorialPool
    .filter((item) => item.id !== primary?.id && Boolean(item.destaque))
    .slice(0, 3);

  const latestPool = filtered.filter((item) => item.id !== primary?.id);
  const totalPages = Math.max(1, Math.ceil(latestPool.length / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const latest = latestPool.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const mostRead = [...allNews]
    .sort((a, b) => b.contagemVisualizacoes - a.contagemVisualizacoes)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        kicker="Notícias"
        title="Informação, memória e acontecimentos da Verdadeira Luz nº 06"
        description="Acompanhe as notícias, sessões, ações e registros institucionais da Loja."
        photoUrl={heroPhoto?.url}
        photoPosicao={heroPhoto?.posicao}
        actions={
          canManageHeroPhoto && (
            <PageHeroPhotoUpload
              pageKey="noticias"
              path="/noticias"
              hasPhoto={Boolean(heroPhoto)}
              initialPosicao={heroPhoto?.posicao ?? 50}
            />
          )
        }
      />

      <form action="/noticias" method="get" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto]">
        <div className="border-border bg-surface flex items-center rounded-xl border px-4">
          <span className="text-muted mr-2 text-sm" aria-hidden="true">
            ⌕
          </span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Pesquisar notícias, sessões, irmãos ou temas..."
            className="h-11 min-w-0 w-full bg-transparent text-sm outline-none"
          />
          {selectedCategory && <input type="hidden" name="categoria" value={selectedCategory} />}
        </div>

        <select
          name="ano"
          defaultValue={selectedYear}
          aria-label="Filtrar notícias por ano"
          className="border-border bg-surface text-foreground h-11 rounded-xl border px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">Todos os anos</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="bg-primary text-primary-foreground h-11 rounded-xl px-5 text-sm font-semibold"
        >
          Filtrar
        </button>
      </form>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Link
          href={buildHref({ category: null, query, year: selectedYear })}
          className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition-colors ${
            !selectedCategory ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-surface'
          }`}
        >
          Todas
        </Link>
        {categories.map((category) => (
          <Link
            key={category}
            href={buildHref({ category, query, year: selectedYear })}
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
              className="border-border bg-surface group block overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md md:relative md:min-h-[430px] md:border-white/10 md:bg-slate-950"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-900 md:absolute md:inset-0 md:aspect-auto">
                {primary.imagemCapaUrl ? (
                  <img
                    src={primary.imagemCapaUrl}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="from-primary h-full w-full bg-gradient-to-br to-slate-950" />
                )}
                <div className="absolute inset-0 hidden bg-gradient-to-t from-black via-black/55 to-black/10 md:block" />
              </div>

              <div className="relative p-5 sm:p-6 md:absolute md:inset-x-0 md:bottom-0 md:p-8">
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge variant="default">
                    {primary.destaquePrincipal ? 'Destaque principal' : 'Destaque'}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="md:border-white/30 md:bg-black/20 md:text-white"
                  >
                    {primary.categoria}
                  </Badge>
                </div>

                <h1 className="font-display text-balance text-[1.7rem] font-semibold leading-[1.08] text-foreground sm:text-3xl md:max-w-4xl md:text-4xl md:text-white">
                  {primary.titulo}
                </h1>

                <p className="text-muted mt-3 line-clamp-3 text-sm leading-relaxed sm:text-base md:max-w-3xl md:text-white/80">
                  {excerpt(primary, 220)}
                </p>

                <div className="text-muted mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs md:text-white/70">
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
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-2xl font-semibold">Últimas notícias</h2>
                <div className="flex flex-wrap items-center gap-3">
                  {(selectedCategory || query || selectedYear) && (
                    <Link href="/noticias" className="text-primary text-sm hover:underline">
                      Limpar filtros
                    </Link>
                  )}
                  <Link
                    href="/noticias/todas"
                    className="border-primary text-primary hover:bg-primary hover:text-white rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
                  >
                    Todas as notícias
                  </Link>
                </div>
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

              {totalPages > 1 && (
                <nav
                  className="mt-5 flex flex-wrap items-center justify-between gap-3"
                  aria-label="Paginação das últimas notícias"
                >
                  {currentPage > 1 ? (
                    <Link
                      href={buildHref({
                        category: selectedCategory,
                        query,
                        year: selectedYear,
                        page: currentPage - 1,
                      })}
                      className="border-border bg-surface hover:border-primary rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                    >
                      ← Anterior
                    </Link>
                  ) : (
                    <span className="border-border text-muted rounded-lg border px-4 py-2 text-sm opacity-50">
                      ← Anterior
                    </span>
                  )}

                  <span className="text-muted text-sm">
                    Página <strong className="text-foreground">{currentPage}</strong> de{' '}
                    <strong className="text-foreground">{totalPages}</strong>
                  </span>

                  {currentPage < totalPages ? (
                    <Link
                      href={buildHref({
                        category: selectedCategory,
                        query,
                        year: selectedYear,
                        page: currentPage + 1,
                      })}
                      className="border-border bg-surface hover:border-primary rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                    >
                      Próxima →
                    </Link>
                  ) : (
                    <span className="border-border text-muted rounded-lg border px-4 py-2 text-sm opacity-50">
                      Próxima →
                    </span>
                  )}
                </nav>
              )}
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
                    href={buildHref({ category, query: '', year: selectedYear })}
                    className="border-border hover:border-primary rounded-full border px-3 py-1.5 text-xs transition-colors"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </section>

            <section className="border-border bg-surface rounded-xl border p-4">
              <h2 className="font-display text-lg font-semibold">Memória da Loja</h2>
              <p className="text-muted mt-2 text-sm leading-relaxed">
                As notícias registram o presente; o Acervo VL6 conecta esses acontecimentos à
                história, às gestões, aos eventos, às fotografias e aos documentos da Loja.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  href="/acervo/linha-do-tempo"
                  className="text-primary text-sm font-semibold hover:underline"
                >
                  Explorar a linha do tempo →
                </Link>
                <Link
                  href="/acervo/pesquisar"
                  className="text-primary text-sm font-semibold hover:underline"
                >
                  Pesquisar no Acervo VL6 →
                </Link>
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
