import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { Badge, BookOpen, Button, Card, CardContent, Star } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AddToLibraryCartButton } from '@/modules/library/components/library-cart';
import { LoanRequestForm, ReviewForm } from '@/modules/library/components/library-engagement-forms';

export default async function LibraryItemPage({
  params,
}: {
  params: Promise<{ libraryItemId: string }>;
}) {
  const session = await requirePagePermission('libraryItem:read');
  const { libraryItemId } = await params;
  const container = createServerContainer();
  const item = await container.repositories.libraryItem.findById(libraryItemId);
  if (!item || item.tenantId !== session.authContext.tenantId || item.deletedAt) notFound();

  const [copies, reviews, myReview, eventsPage] = await Promise.all([
    container.repositories.libraryCirculation.listCopiesByItem(
      session.authContext.tenantId,
      item.id,
    ),
    container.repositories.libraryCirculation.listReviewsByItem(
      session.authContext.tenantId,
      item.id,
    ),
    container.repositories.libraryCirculation.findReviewByUser(
      session.authContext.tenantId,
      item.id,
      session.authContext.uid,
    ),
    container.useCases.listUpcomingEvents.execute(session.authContext, { limit: 30 }),
  ]);
  const physical = item.formato !== 'digital';
  const available = copies.filter((copy) => copy.situacao === 'disponivel');
  const average = item.quantidadeAvaliacoes
    ? (item.somaAvaliacoes ?? 0) / item.quantidadeAvaliacoes
    : null;

  return (
    <div className="grid gap-6">
      <Button asChild variant="ghost" className="w-full sm:w-fit">
        <Link href="/acervo/biblioteca">← Voltar ao catálogo</Link>
      </Button>

      <section className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="bg-surface overflow-hidden rounded-xl border">
          {item.capaUrl ? (
            <img
              src={item.capaUrl}
              alt={`Capa de ${item.titulo ?? 'obra'}`}
              className="h-[390px] w-full object-contain"
            />
          ) : (
            <div className="text-muted flex h-[390px] items-center justify-center">
              <BookOpen size={64} />
            </div>
          )}
        </div>
        <div className="grid content-start gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge>{item.formato === 'fisico_digital' ? 'Físico + digital' : item.formato}</Badge>
            {physical && (
              <Badge variant={available.length ? 'success' : 'warning'}>
                {available.length
                  ? `${available.length} exemplar(es) disponível(is)`
                  : 'Emprestado'}
              </Badge>
            )}
          </div>
          <div>
            <h1 className="font-display break-words text-2xl font-semibold sm:text-3xl">
              {item.titulo}
            </h1>
            <p className="text-muted">{item.autor ?? 'Autoria não informada'}</p>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-sm min-[390px]:grid-cols-2 md:grid-cols-3">
            <Metadata label="Tipo" value={item.tipoMaterial} />
            <Metadata label="Ano" value={item.anoPublicacao} />
            <Metadata label="Editora" value={item.editora} />
            <Metadata label="ISBN" value={item.isbn} />
            <Metadata label="Código de barras/EAN" value={item.codigoBarras} />
            <Metadata label="Classificação" value={item.codigoClassificacao} />
            <Metadata
              label="Prazo sugerido"
              value={physical ? `${item.prazoEmprestimoDias ?? 21} dias` : null}
            />
          </dl>
          {average !== null && (
            <p className="flex items-center gap-1 text-sm">
              <Star size={16} /> {average.toFixed(1)} de 5 · {item.quantidadeAvaliacoes}{' '}
              avaliação(ões)
            </p>
          )}
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            {item.fileId && item.permiteLeituraOnline && (
              <Button asChild className="w-full sm:w-auto">
                <a href={`/api/library-items/${item.id}`}>Ler online</a>
              </Button>
            )}
            {item.fileId && (
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <a href={`/api/library-items/${item.id}?mode=download`}>Baixar arquivo</a>
              </Button>
            )}
            {physical && available.length > 0 && (
              <AddToLibraryCartButton itemId={item.id} title={item.titulo ?? 'obra'} />
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TextPanel title="Sinopse" text={item.sinopse} fallback="Sinopse não informada." />
        <TextPanel
          title="Dica do Irmão Bibliotecário"
          text={item.parecerBibliotecario}
          fallback="O Bibliotecário ainda não publicou uma percepção sobre esta obra."
        />
      </section>

      {physical && available.length > 0 && eventsPage.items.length > 0 && (
        <LoanRequestForm libraryItemId={item.id} events={eventsPage.items} />
      )}

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <ReviewForm
          libraryItemId={item.id}
          defaultRating={myReview?.rating ?? 5}
          defaultComment={myReview?.comentario}
        />
        <Card>
          <CardContent className="grid gap-4 p-4 sm:p-5">
            <h2 className="font-display text-lg font-semibold">Opiniões dos Irmãos</h2>
            {reviews.length === 0 ? (
              <p className="text-muted text-sm">Seja o primeiro a avaliar esta obra.</p>
            ) : (
              reviews.map((review) => (
                <article key={review.id} className="border-b pb-3 last:border-0">
                  <p className="font-medium">
                    {review.memberName} · {review.rating}/5
                  </p>
                  {review.comentario && (
                    <p className="text-muted mt-1 text-sm">{review.comentario}</p>
                  )}
                </article>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metadata({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="font-medium">{value || 'Não informado'}</dd>
    </div>
  );
}

function TextPanel({
  title,
  text,
  fallback,
}: {
  title: string;
  text?: string | null;
  fallback: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="font-display mb-2 text-lg font-semibold">{title}</h2>
        <p className="text-muted whitespace-pre-wrap text-sm leading-relaxed">{text || fallback}</p>
      </CardContent>
    </Card>
  );
}
