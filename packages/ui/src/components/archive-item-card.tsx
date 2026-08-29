import * as React from 'react';
import { cn } from '../lib/cn';

export interface ArchiveItemCardProps {
  /** Navega pra página cheia do item. Omitir quando `onClick` for passado (ex.: abrir um visualizador em vez de navegar). */
  href?: string;
  /** Alternativa a `href` — o card vira um `<button>` (ex.: abrir `MediaViewerModal` sem sair da página). */
  onClick?: () => void;
  /** Miniatura real do item — quando presente, substitui o card só-texto por um com prévia visual no topo. */
  thumbnailUrl?: string | null;
  kindLabel: string;
  icon?: React.ReactNode;
  titulo: string;
  descricao?: string | null;
  className?: string;
  linkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
  }>;
}

/**
 * Card uniforme para qualquer tipo de conteúdo do Acervo VL6 (documento,
 * biblioteca, foto/vídeo) — usado em listas e resultados de pesquisa.
 * `linkComponent` aceita `next/link` (padrão de navegação interna); quando
 * omitido cai para `<a>` simples, útil para rotas-irmãs estáticas onde a
 * interceptação de rota do Next não deve disparar (ver
 * `docs/architecture/11-acervo-vl6.md`).
 */
export function ArchiveItemCard({
  href,
  onClick,
  thumbnailUrl,
  kindLabel,
  icon,
  titulo,
  descricao,
  className,
  linkComponent: Link = ({ href: linkHref, className: linkClassName, children }) => (
    <a href={linkHref} className={linkClassName}>
      {children}
    </a>
  ),
}: ArchiveItemCardProps) {
  const content = (
    <>
      {thumbnailUrl && (
        <div className="bg-background border-border mb-3 aspect-video w-full overflow-hidden rounded-md border">
          <img src={thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="text-accent flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
        {icon}
        {kindLabel}
      </div>
      <h3 className="font-display group-hover:text-accent mt-2 line-clamp-2 font-semibold transition-colors">
        {titulo}
      </h3>
      {descricao && <p className="text-muted mt-1 line-clamp-2 text-xs leading-5">{descricao}</p>}
    </>
  );

  const cardClassName = cn(
    'border-border hover:border-accent group rounded-lg border p-4 text-left transition-colors',
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn('w-full', cardClassName)}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href ?? '#'} className={cardClassName}>
      {content}
    </Link>
  );
}
