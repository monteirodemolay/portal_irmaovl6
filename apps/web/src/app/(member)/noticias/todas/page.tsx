import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveHeroPhoto, type News } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { EmptyState, PageHero } from '@vl6/ui';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

const PAGE_SIZE = 12;

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
  return value.length > max ? value.slice(0, max).trim() + '…' : value;
}

function formatDate(date: Date | null): string {
  return date
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(new Date(date))
    : 'Sem data';
}

function readingTime(news: News): number {
  const words = stripHtml(news.conteudoHtml).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

function buildHref({
  query,
  category,
  year,
  order,
  page,
}: {
  query: string;
  category: string;
  year: string;
  order: 'desc' | 'asc';
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (category) params.set('categoria', category);
  if (year) params.set('ano', year);
  if (order === 'asc') params.set('ordem', 'antigas');
  if (page && page > 1) params.set('pagina', String(page));
  const suffix = params.toString();
  return suffix ? '/noticias/todas?' + suffix : '/noticias/todas';
}

function memoryHref(news: News): string {
  const year = news.dataPublicacao?.getFullYear();
  return year ? '/acervo/linha-do-tempo#year-' + year : '/acervo/linha-do-tempo';
}

export default async function AllNewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    ano?: string;
    ordem?: string;
    pagina?: string;
  }>;
}) {
  const [current, params] = await Promise.all([getCurrentTenant(), searchParams]);
  if (!current) notFound();

  const query = params.q?.trim() ?? '';
  const selectedCategory = params.categoria?.trim() ?? '';
  const selectedYear = /^\d{4}$/.test(params.ano ?? '') ? params.ano! : '';
  const order: 'desc' | 'asc' = params.ordem === 'antigas' ? 'asc' : 'desc';
  const requestedPage = Math.max(1, Number.parseInt(params.pagina ?? '1', 10) || 1);

  const container = createServerContainer();
  const published = await container.useCases.listPublishedNews.execute(current.tenant.id, {
    limit: 500,
  });

  const allNews = published.items;
  const heroPhoto = resolveHeroPhoto(current.tenant, 'noticias');
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
  const filtered = allNews
    .filter((item) => {
      if (selectedCategory && item.categoria !== selectedCategory) return false;
      if (selectedYear && String(item.dataPublicacao?.getFullYear() ?? '') !== selectedYear) return false;
      if (!normalizedQuery) return true;

      const haystack = [
        item.titulo,
        item.subtitulo ?? '',
        item.categoria,
        stripHtml(item.conteudoHtml),
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR');
      return haystack.includes(normalizedQuery);
    })
    .sort((a, b) => {
      const aTime = a.dataPublicacao?.getTime() ?? 0;
      const bTime = b.dataPublicacao?.getTime() ?? 0;
      return order === 'desc' ? bTime - aTime : aTime - bTime;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasFilters = Boolean(query || selectedCategory || selectedYear || order === 'asc');

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        kicker="Arquivo de Notícias"
        title="Todas as notícias da Verdadeira Luz nº 06"
        description="Consulte o histórico de publicações da Loja da mais recente à mais antiga, com pesquisa, filtros e acesso direto às memórias relacionadas no Acervo VL6."
        photoUrl={heroPhoto?.url}
        photoPosicao={heroPhoto?.posicao}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/noticias"
              className="rounded-lg border border-white/35 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-accent"
            >
              ← Voltar aos destaques
            </Link>
            <Link
              href="/acervo/linha-do-tempo"
              className="rounded-lg border border-white/35 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-accent"
            >
              Linha do tempo da Loja
            </Link>
          </div>
        }
      />

      <section className="border-border bg-surface rounded-2xl border p-4 sm:p-5">
        <form
          action="/noticias/todas"
          method="get"
          className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_150px_190px_auto]"
        >
          <div className="border-border flex min-w-0 items-center rounded-xl border px-4">
            <span className="text-muted mr-2" aria-hidden="true">⌕</span>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Pesquisar por título, assunto, Irmão, sessão..."
              className="h-11 min-w-0 w-full bg-transparent text-sm outline-none"
            />
          </div>

          <select
            name="categoria"
            defaultValue={selectedCategory}
            aria-label="Filtrar por editoria"
            className="border-border bg-surface h-11 rounded-xl border px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">Todas as editorias</option>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            name="ano"
            defaultValue={selectedYear}
            aria-label="Filtrar por ano"
            className="border-border bg-surface h-11 rounded-xl border px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">Todos os anos</option>
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select
            name="ordem"
            defaultValue={order === 'asc' ? 'antigas' : 'recentes'}
            aria-label="Ordenação"
            className="border-border bg-surface h-11 rounded-xl border px-3 text-sm outline-none focus:border-primary"
          >
            <option value="recentes">Mais novas primeiro</option>
            <option value="antigas">Mais antigas primeiro</option>
          </select>

          <button
            type="submit"
            className="bg-primary text-white h-11 rounded-xl px-5 text-sm font-semibold"
          >
            Aplicar filtros
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted text-sm">
            <strong className="text-foreground">{filtered.length}</strong>{' '}
            {filtered.length === 1 ? 'notícia encontrada' : 'notícias encontradas'}
          </p>
          {hasFilters && (
            <Link href="/noticias/todas" className="text-primary text-sm font-semibold hover:underline">
              Limpar todos os filtros
            </Link>
          )}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <main className="min-w-0">
          {visible.length === 0 ? (
            <EmptyState
              title="Nenhuma notícia encontrada"
              description="Altere os termos da pesquisa ou remova algum filtro."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {visible.map((item) => (
                <article
                  key={item.id}
                  className="border-border bg-surface grid overflow-hidden rounded-2xl border shadow-sm sm:grid-cols-[230px_minmax(0,1fr)]"
                >
                  <Link href={'/noticias/' + item.slug} className="block min-h-48 overflow-hidden bg-slate-900 sm:min-h-full">
                    {item.imagemCapaUrl ? (
                      <img
                        src={item.imagemCapaUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="from-primary to-primary-dark h-full min-h-48 bg-gradient-to-br" />
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-col p-5">
                    <div className="text-accent flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-wide">
                      <span>{item.categoria}</span>
                      <span aria-hidden="true">•</span>
                      <span>{formatDate(item.dataPublicacao)}</span>
                    </div>

                    <Link href={'/noticias/' + item.slug} className="group">
                      <h2 className="font-display mt-2 text-xl font-semibold leading-snug group-hover:underline sm:text-2xl">
                        {item.titulo}
                      </h2>
                    </Link>

                    <p className="text-muted mt-2 line-clamp-3 text-sm leading-6">{excerpt(item)}</p>

                    <div className="text-muted mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span>{readingTime(item)} min de leitura</span>
                      <span>{item.contagemVisualizacoes} visualizações</span>
                    </div>

                    <div className="border-border mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
                      <Link
                        href={'/noticias/' + item.slug}
                        className="text-primary text-sm font-semibold hover:underline"
                      >
                        Ler notícia completa →
                      </Link>
                      <Link
                        href={memoryHref(item)}
                        className="text-muted hover:text-primary text-sm font-medium"
                      >
                        Ver este período na memória da Loja
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav
              className="mt-6 flex flex-wrap items-center justify-between gap-3"
              aria-label="Paginação de todas as notícias"
            >
              {currentPage > 1 ? (
                <Link
                  href={buildHref({
                    query,
                    category: selectedCategory,
                    year: selectedYear,
                    order,
                    page: currentPage - 1,
                  })}
                  className="border-border bg-surface hover:border-primary rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
                >
                  ← Anterior
                </Link>
              ) : (
                <span className="border-border text-muted rounded-lg border px-4 py-2 text-sm opacity-50">
                  ← Anterior
                </span>
              )}

              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {Array.from({ length: totalPages }, (_, index) => index + 1)
                  .filter(
                    (pageNumber) =>
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      Math.abs(pageNumber - currentPage) <= 2,
                  )
                  .map((pageNumber, index, pages) => {
                    const previous = pages[index - 1];
                    return (
                      <span key={pageNumber} className="flex items-center gap-1.5">
                        {previous && pageNumber - previous > 1 && (
                          <span className="text-muted px-1">…</span>
                        )}
                        <Link
                          href={buildHref({
                            query,
                            category: selectedCategory,
                            year: selectedYear,
                            order,
                            page: pageNumber,
                          })}
                          aria-current={pageNumber === currentPage ? 'page' : undefined}
                          className={
                            pageNumber === currentPage
                              ? 'bg-primary text-white flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold'
                              : 'border-border bg-surface hover:border-primary flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium'
                          }
                        >
                          {pageNumber}
                        </Link>
                      </span>
                    );
                  })}
              </div>

              {currentPage < totalPages ? (
                <Link
                  href={buildHref({
                    query,
                    category: selectedCategory,
                    year: selectedYear,
                    order,
                    page: currentPage + 1,
                  })}
                  className="border-border bg-surface hover:border-primary rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
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
        </main>

        <aside className="flex flex-col gap-4">
          <section className="from-primary to-primary-dark rounded-2xl bg-gradient-to-br p-5 text-white">
            <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
              Memória institucional
            </p>
            <h2 className="font-display mt-2 text-xl font-semibold">
              Da notícia para a história da Loja
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/75">
              Consulte os acontecimentos por ano e encontre registros complementares, como eventos,
              gestões, fotografias e documentos preservados no Acervo VL6.
            </p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <Link href="/acervo/linha-do-tempo" className="text-accent font-semibold hover:underline">
                Linha do tempo →
              </Link>
              <Link href="/acervo/eventos" className="text-white/85 hover:text-white hover:underline">
                Eventos e sessões →
              </Link>
              <Link href="/acervo/gestoes" className="text-white/85 hover:text-white hover:underline">
                Gestões da Loja →
              </Link>
              <Link href="/acervo/pesquisar" className="text-white/85 hover:text-white hover:underline">
                Pesquisa completa no Acervo →
              </Link>
            </div>
          </section>

          <section className="border-border bg-surface rounded-2xl border p-5">
            <h2 className="font-display text-lg font-semibold">Arquivo por ano</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {years.map((year) => (
                <Link
                  key={year}
                  href={buildHref({
                    query: '',
                    category: '',
                    year: String(year),
                    order: 'desc',
                  })}
                  className={
                    selectedYear === String(year)
                      ? 'bg-primary text-white rounded-full px-3 py-1.5 text-xs font-semibold'
                      : 'border-border hover:border-primary rounded-full border px-3 py-1.5 text-xs'
                  }
                >
                  {year}
                </Link>
              ))}
            </div>
          </section>

          <section className="border-border bg-surface rounded-2xl border p-5">
            <h2 className="font-display text-lg font-semibold">Editorias</h2>
            <div className="mt-3 flex flex-col gap-2">
              {categories.map((category) => (
                <Link
                  key={category}
                  href={buildHref({
                    query: '',
                    category,
                    year: selectedYear,
                    order: 'desc',
                  })}
                  className="text-muted hover:text-primary text-sm transition-colors"
                >
                  {category}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
