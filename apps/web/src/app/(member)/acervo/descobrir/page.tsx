import Link from '@/components/layout/context-link';
import type { ReactNode } from 'react';
import { createServerContainer } from '@vl6/infra';
import {
  ArchiveItemCard,
  BookOpen,
  CalendarDays,
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
  noticia: <FileText size={14} />,
};

const RECENT_LIMIT = 8;

export default async function ArchiveDiscoverPage() {
  const session = await requireSession();
  const container = createServerContainer();
  const allResults = await loadArchiveSearchResults(
    session.authContext,
    container,
    session.role,
  );

  const recentResults = [...allResults]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, RECENT_LIMIT);

  return (
    <div className="flex flex-col gap-9">
      <AcervoPageHeader title="Descobrir" backHref="/acervo" />

      <section aria-labelledby="recent-title">
        <div className="mb-4">
          <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
            Adicionados recentemente
          </p>
          <h2 id="recent-title" className="font-display text-2xl font-semibold">
            Novidades no Acervo
          </h2>
          <p className="text-muted mt-1 max-w-2xl text-sm">
            Aqui aparecem registros com conteúdo efetivamente disponível. Acontecimentos sem mídias permanecem preservados na Linha do Tempo, sem gerar álbum vazio.
          </p>
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
