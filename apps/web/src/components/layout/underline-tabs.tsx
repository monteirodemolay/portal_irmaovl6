import Link from 'next/link';
import { cn } from '@vl6/ui';

export interface UnderlineTabItem {
  href: string;
  label: string;
}

/**
 * Fileira horizontal de abas sublinhadas com scroll contido em telas
 * estreitas (`overflow-x-auto`) — miolo compartilhado por `TabNav` e
 * `LibraryAdminNav`, que antes reimplementavam a mesma marcação/estilo
 * cada um por conta própria (risco de um ajuste de estilo/acessibilidade
 * ser feito num só lugar e esquecido no outro).
 */
export function UnderlineTabs({
  items,
  activeHref,
  ariaLabel,
  className,
}: {
  items: UnderlineTabItem[];
  activeHref: string | undefined;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        'border-border w-full max-w-full overflow-x-auto whitespace-nowrap border-b',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'mr-1 inline-block whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors last:mr-0',
              active
                ? 'border-primary text-primary'
                : 'text-muted hover:text-foreground border-transparent',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
