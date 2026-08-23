import Link from 'next/link';
import type { ReactNode } from 'react';
import { createServerContainer } from '@vl6/infra';
import {
  ArchiveItemCard,
  BookOpen,
  CalendarDays,
  EmptyState,
  FileText,
  FilterBar,
  Image as GalleryIcon,
  Search,
} from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import {
  ARCHIVE_SEARCH_KIND_LABELS,
  ARCHIVE_SEARCH_KINDS,
  loadArchiveSearchResults,
  matchesArchiveSearch,
  type ArchiveSearchKind,
} from '@/modules/archive/lib/search-archive';

const KIND_ICONS: Record<ArchiveSearchKind, ReactNode> = {
  documento: <FileText size={14} />,
  biblioteca: <BookOpen size={14} />,
  fotografia: <GalleryIcon size={14} />,
  evento: <CalendarDays size={14} />,
};

function buildHref(query: string, kind?: ArchiveSearchKind): string {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (kind) params.set('tipo', kind);
  const queryString = params.toString();
  return `/acervo/pesquisar${queryString ? `?${queryString}` : ''}`;
}

export default async function ArchiveSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  const query = params.q?.trim() ?? '';
  const requestedKind = params.tipo as ArchiveSearchKind | undefined;
  const validKind =
    requestedKind && ARCHIVE_SEARCH_KINDS.includes(requestedKind) ? requestedKind : undefined;

  const container = createServerContainer();
  const allResults = await loadArchiveSearchResults(session.authContext, container, session.role);
  const results = allResults
    .filter((result) => !validKind || result.kind === validKind)
    .filter((result) => matchesArchiveSearch(result, query));

  const filterItems = ARCHIVE_SEARCH_KINDS.map((kind) => ({
    value: kind,
    label: ARCHIVE_SEARCH_KIND_LABELS[kind],
    href: buildHref(query, validKind === kind ? undefined : kind),
  }));

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader title="Pesquisar" backHref="/acervo" />

      <form action="/acervo/pesquisar" method="get" role="search">
        {validKind && <input type="hidden" name="tipo" value={validKind} />}
        <label htmlFor="archive-search-full" className="sr-only">
          Pesquisar no Acervo VL6
        </label>
        <div className="border-border bg-surface flex max-w-2xl items-center gap-3 rounded-[14px] border px-4 py-1.5 shadow-sm">
          <Search className="text-muted shrink-0" size={20} />
          <input
            id="archive-search-full"
            name="q"
            defaultValue={query}
            placeholder="Pesquise títulos, assuntos ou tipos de conteúdo..."
            className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
          />
          <button
            type="submit"
            className="bg-primary hover:bg-primary-dark rounded-[9px] px-4 py-2 text-sm font-semibold text-white transition-colors"
          >
            Pesquisar
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar
          items={filterItems}
          activeValue={validKind}
          ariaLabel="Filtrar por tipo"
          linkComponent={Link}
        />
        {(query || validKind) && (
          <Link
            href="/acervo/pesquisar"
            className="text-muted hover:text-accent text-xs font-medium"
          >
            Limpar pesquisa
          </Link>
        )}
      </div>

      <p className="text-muted text-sm">
        {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
        {query && ` para “${query}”`}
      </p>

      {results.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title="Nenhum conteúdo encontrado"
          description="Tente outro termo ou ajuste os filtros de tipo."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((result) => (
            <ArchiveItemCard
              key={`${result.kind}-${result.id}`}
              href={result.href}
              kindLabel={ARCHIVE_SEARCH_KIND_LABELS[result.kind]}
              icon={KIND_ICONS[result.kind]}
              titulo={result.title}
              descricao={result.description}
              linkComponent={Link}
            />
          ))}
        </div>
      )}
    </div>
  );
}
