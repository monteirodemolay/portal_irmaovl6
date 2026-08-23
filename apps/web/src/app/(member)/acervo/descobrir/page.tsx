import Link from 'next/link';
import type { ReactNode } from 'react';
import { createServerContainer } from '@vl6/infra';
import {
  ArchiveItemCard,
  BookOpen,
  CalendarDays,
  Compass,
  EmptyState,
  FileText,
  Image as GalleryIcon,
} from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import {
  ARCHIVE_SEARCH_KIND_LABELS,
  loadArchiveSearchResults,
  type ArchiveSearchKind,
} from '@/modules/archive/lib/search-archive';

const KIND_ICONS: Record<ArchiveSearchKind, ReactNode> = {
  documento: <FileText size={14} />,
  biblioteca: <BookOpen size={14} />,
  fotografia: <GalleryIcon size={14} />,
  evento: <CalendarDays size={14} />,
};

const RECENT_LIMIT = 8;

export default async function ArchiveDiscoverPage() {
  const session = await requireSession();
  const container = createServerContainer();

  const [allResults, collections] = await Promise.all([
    loadArchiveSearchResults(session.authContext, container, session.role),
    container.useCases.listPublishedArchiveCollections.execute(session.authContext),
  ]);

  const recentResults = [...allResults]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, RECENT_LIMIT);

  return (
    <div className="flex flex-col gap-9">
      <AcervoPageHeader title="Descobrir" backHref="/acervo" />

      <section aria-labelledby="collections-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
              Curadoria editorial
            </p>
            <h2 id="collections-title" className="font-display text-2xl font-semibold">
              Coleções
            </h2>
          </div>
          <Link
            href="/acervo/colecoes"
            className="text-muted hover:text-accent text-xs font-medium"
          >
            Ver todas
          </Link>
        </div>

        {collections.length === 0 ? (
          <EmptyState
            icon={<Compass size={22} />}
            title="Nenhuma coleção publicada ainda"
            description="Coleções editoriais aparecerão aqui assim que forem publicadas."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {collections.slice(0, 6).map((collection) => (
              <Link
                key={collection.id}
                href={`/acervo/colecoes/${collection.slug}`}
                className="border-border bg-surface hover:border-accent group flex flex-col rounded-[16px] border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="bg-primary/5 text-primary group-hover:bg-primary group-hover:text-accent flex h-11 w-11 items-center justify-center rounded-[12px] transition-colors">
                  <Compass size={22} strokeWidth={1.6} />
                </div>
                <h3 className="font-display mt-5 text-lg font-semibold">{collection.titulo}</h3>
                {collection.descricaoEditorial && (
                  <p className="text-muted mt-1 line-clamp-2 flex-1 text-xs leading-5">
                    {collection.descricaoEditorial}
                  </p>
                )}
                <p className="text-muted mt-4 text-xs">
                  {collection.itemIds.length} {collection.itemIds.length === 1 ? 'item' : 'itens'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="recent-title">
        <div className="mb-4">
          <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
            Adicionados recentemente
          </p>
          <h2 id="recent-title" className="font-display text-2xl font-semibold">
            Novidades no Acervo
          </h2>
        </div>

        {recentResults.length === 0 ? (
          <EmptyState title="Nenhum conteúdo disponível ainda" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentResults.map((result) => (
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
      </section>
    </div>
  );
}
