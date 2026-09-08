import type { News } from '@vl6/domain';
import { Card, Newspaper } from '@vl6/ui';
import Link from 'next/link';
import { DashboardSectionHeading } from './dashboard-section-heading';

function formatNewsDate(date: Date | null): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Módulo editorial "Acontece na Verdadeira Luz" — uma notícia principal
 * (com capa, se houver) + até duas secundárias, sempre com dados reais do
 * módulo de Notícias. Some da Home (não mostra cards vazios) quando não
 * há nenhuma notícia publicada.
 */
export function NewsHighlights({ news }: { news: News[] }) {
  if (news.length === 0) return null;

  const [main, ...rest] = news;
  const secondary = rest.slice(0, 2);

  return (
    <Card className="flex flex-col gap-4 p-5 shadow-none">
      <DashboardSectionHeading
        icon={Newspaper}
        title="Acontece na Verdadeira Luz"
        href="/noticias"
        hrefLabel="Ver todas as notícias"
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_minmax(180px,0.7fr)]">
        {main && (
          <Link
            href={`/noticias/${main.slug}`}
            className="group grid grid-cols-[130px_minmax(0,1fr)] items-start gap-3.5 sm:grid-cols-[150px_minmax(0,1fr)]"
          >
            {main.imagemCapaUrl ? (
              <img
                src={main.imagemCapaUrl}
                alt=""
                className="h-28 w-full rounded-lg object-cover"
              />
            ) : (
              <div className="from-primary to-primary-dark h-28 w-full rounded-lg bg-gradient-to-br" />
            )}
            <div className="min-w-0">
              <p className="text-muted text-xs">{formatNewsDate(main.dataPublicacao)}</p>
              <p className="font-display mt-1 line-clamp-3 text-lg font-semibold leading-tight group-hover:underline">
                {main.titulo}
              </p>
              {main.subtitulo && (
                <p className="text-muted mt-1.5 line-clamp-2 text-sm">{main.subtitulo}</p>
              )}
            </div>
          </Link>
        )}
        {secondary.length > 0 && (
          <div className="flex flex-col gap-3">
            {secondary.map((item) => (
              <Link
                key={item.id}
                href={`/noticias/${item.slug}`}
                className="border-border group grid grid-cols-[55px_minmax(0,1fr)] items-center gap-2.5 border-b pb-3 last:border-0 last:pb-0"
              >
                {item.imagemCapaUrl ? (
                  <img
                    src={item.imagemCapaUrl}
                    alt=""
                    className="h-11 w-full rounded object-cover"
                  />
                ) : (
                  <div className="from-primary to-primary-dark h-11 w-full rounded bg-gradient-to-br" />
                )}
                <div className="min-w-0">
                  <p className="line-clamp-2 text-xs font-semibold leading-tight group-hover:underline">
                    {item.titulo}
                  </p>
                  <p className="text-muted mt-0.5 text-[10px]">
                    {formatNewsDate(item.dataPublicacao)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
