import Link from 'next/link';

/**
 * Cabeçalho padrão das páginas do Acervo Digital (Documentos, Biblioteca,
 * Fotografias, Favoritos) — o rótulo "Acervo Digital" acima do título sinaliza
 * visualmente que essas quatro áreas pertencem a um mesmo espaço, mesmo
 * continuando como entidades/rotas separadas (auditoria: evitar que o Irmão
 * veja "Arquivos, Biblioteca, Downloads" como três áreas desconexas).
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
      {backHref && backLabel ? (
        <Link
          href={backHref}
          className="text-muted hover:text-accent text-[11px] font-medium uppercase tracking-wide"
        >
          Acervo Digital · {backLabel}
        </Link>
      ) : (
        <p className="text-muted text-[11px] font-medium uppercase tracking-wide">Acervo Digital</p>
      )}
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      {description && <p className="text-muted mt-1 text-sm">{description}</p>}
    </div>
  );
}
