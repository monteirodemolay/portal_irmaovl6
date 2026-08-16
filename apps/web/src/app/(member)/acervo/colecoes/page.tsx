import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { Compass, EmptyState } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';

export default async function ArchiveCollectionsPage() {
  const session = await requireSession();
  const container = createServerContainer();
  const collections = await container.useCases.listPublishedArchiveCollections.execute(
    session.authContext,
  );

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader title="Coleções" backHref="/acervo" />

      {collections.length === 0 ? (
        <EmptyState
          icon={<Compass size={22} />}
          title="Nenhuma coleção publicada ainda"
          description="Coleções editoriais reúnem documentos, biblioteca e fotos em torno de um tema — aparecerão aqui assim que forem publicadas."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
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
                {collection.curadoPor && ` · curadoria de ${collection.curadoPor}`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
