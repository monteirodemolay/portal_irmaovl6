export interface NewsInstagramLinksProps {
  urls: string[];
  title?: string;
  compact?: boolean;
}

export function NewsInstagramLinks({
  urls,
  title = 'Também publicado no Instagram',
  compact = false,
}: NewsInstagramLinksProps) {
  const unique = [...new Set(urls)].filter(Boolean);
  if (unique.length === 0) return null;

  if (compact) {
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {unique.map((url, index) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="border-border hover:border-accent hover:text-accent inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
          >
            Instagram{unique.length > 1 ? ` ${index + 1}` : ''} ↗
          </a>
        ))}
      </div>
    );
  }

  return (
    <section className="border-border bg-surface mx-auto mt-8 max-w-3xl rounded-2xl border p-5">
      <p className="text-accent text-[11px] font-semibold uppercase tracking-widest">
        Publicação externa
      </p>
      <h2 className="font-display mt-2 text-xl font-semibold">{title}</h2>
      <p className="text-muted mt-2 text-sm leading-6">
        Acompanhe também a publicação veiculada nos canais oficiais da Loja.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {unique.map((url, index) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary text-white hover:opacity-90 inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition-opacity"
          >
            Abrir no Instagram{unique.length > 1 ? ` ${index + 1}` : ''} ↗
          </a>
        ))}
      </div>
    </section>
  );
}
