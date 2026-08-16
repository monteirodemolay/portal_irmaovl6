import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { EmptyState, Sparkles } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';

export default async function ArchiveExhibitionsPage() {
  const session = await requireSession();
  const container = createServerContainer();
  const exhibitions = await container.useCases.listPublishedArchiveExhibitions.execute(
    session.authContext,
  );

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title="Exposições Virtuais"
        description="Narrativas curadas que conectam documentos, fotos e biblioteca em torno de uma história."
        backHref="/acervo"
      />

      {exhibitions.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={22} />}
          title="Nenhuma exposição publicada ainda"
          description="Exposições virtuais aparecerão aqui assim que forem publicadas pela curadoria."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {exhibitions.map((exhibition) => (
            <Link
              key={exhibition.id}
              href={`/acervo/exposicoes/${exhibition.slug}`}
              className="border-border bg-surface hover:border-accent group flex flex-col rounded-[16px] border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="bg-primary/5 text-primary group-hover:bg-primary group-hover:text-accent flex h-11 w-11 items-center justify-center rounded-[12px] transition-colors">
                <Sparkles size={22} strokeWidth={1.6} />
              </div>
              <h3 className="font-display mt-5 text-lg font-semibold">{exhibition.titulo}</h3>
              {exhibition.descricaoEditorial && (
                <p className="text-muted mt-1 line-clamp-2 flex-1 text-xs leading-5">
                  {exhibition.descricaoEditorial}
                </p>
              )}
              <p className="text-muted mt-4 text-xs">
                {exhibition.secoes.length} {exhibition.secoes.length === 1 ? 'seção' : 'seções'}
                {exhibition.curadoPor && ` · curadoria de ${exhibition.curadoPor}`}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
