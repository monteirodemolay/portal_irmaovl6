import Link from 'next/link';

/**
 * Cabeçalho padrão das áreas especializadas do Acervo VL6. As rotas
 * existentes continuam funcionais, mas passam a ter uma origem visual e
 * navegacional única em `/acervo`.
 */
export function AcervoPageHeader({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div>
      <Link
        href={backHref ?? '/acervo'}
        className="text-muted hover:text-accent text-[11px] font-medium uppercase tracking-wide"
      >
        Acervo VL6{backLabel ? ` · ${backLabel}` : ''}
      </Link>
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      {description && <p className="text-muted mt-1 text-sm">{description}</p>}
    </div>
  );
}
