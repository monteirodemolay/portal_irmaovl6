import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { createServerContainer } from '@vl6/infra';
import { ArchiveItemCard, BookOpen, EmptyState, FileText, Image as GalleryIcon } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import {
  resolveArchiveItem,
  type ResolvedArchiveItem,
} from '@/modules/archive/lib/resolve-archive-item';
import type { ArchiveItemKind } from '@/modules/archive/lib/archive-item-id';

const KIND_ICONS: Record<ArchiveItemKind, ReactNode> = {
  file: <FileText size={14} />,
  library: <BookOpen size={14} />,
  'gallery-album': <GalleryIcon size={14} />,
  'gallery-media': <GalleryIcon size={14} />,
};

interface ResolvedSection {
  id: string;
  titulo: string;
  texto: string | null;
  items: ResolvedArchiveItem[];
}

export default async function ArchiveExhibitionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireSession();
  const { slug } = await params;

  const container = createServerContainer();
  const exhibition = await container.useCases.getArchiveExhibitionBySlug.execute(
    session.authContext,
    slug,
  );
  if (!exhibition) notFound();

  const resolvedSections: ResolvedSection[] = await Promise.all(
    exhibition.secoes.map(async (secao) => {
      const items = (
        await Promise.all(
          secao.itemIds.map((itemId) => resolveArchiveItem(itemId, session.authContext, container)),
        )
      ).filter((item): item is ResolvedArchiveItem => item !== null);
      return { id: secao.id, titulo: secao.titulo, texto: secao.texto, items };
    }),
  );

  return (
    <div className="flex flex-col gap-8">
      <AcervoPageHeader
        title={exhibition.titulo}
        backHref="/acervo/exposicoes"
        backLabel="Exposições"
      />

      {exhibition.descricaoEditorial && (
        <p className="max-w-2xl text-sm leading-6">{exhibition.descricaoEditorial}</p>
      )}
      {exhibition.curadoPor && (
        <p className="text-muted text-xs uppercase tracking-wide">
          Curadoria de {exhibition.curadoPor}
        </p>
      )}

      {resolvedSections.length === 0 ? (
        <EmptyState title="Esta exposição ainda não tem seções publicadas" />
      ) : (
        <div className="flex flex-col gap-10">
          {resolvedSections.map((section, index) => (
            <section
              key={section.id}
              aria-labelledby={`secao-${section.id}`}
              className="flex flex-col gap-4"
            >
              <div className="border-border border-l-accent border-l-2 pl-4">
                <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
                  Parte {index + 1}
                </p>
                <h2 id={`secao-${section.id}`} className="font-display text-xl font-semibold">
                  {section.titulo}
                </h2>
                {section.texto && (
                  <p className="text-muted mt-2 max-w-2xl text-sm leading-6">{section.texto}</p>
                )}
              </div>

              {section.items.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {section.items.map((item) => (
                    <ArchiveItemCard
                      key={item.compositeId}
                      href={`/acervo/item/${item.compositeId}`}
                      kindLabel={item.kindLabel}
                      icon={KIND_ICONS[item.kind]}
                      titulo={item.titulo}
                      descricao={item.descricao}
                      linkComponent={Link}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
