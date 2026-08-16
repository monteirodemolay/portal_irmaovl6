import * as React from 'react';
import { cn } from '../lib/cn';

export interface FilterBarItem {
  value: string;
  label: string;
  href: string;
}

export interface FilterBarProps {
  items: FilterBarItem[];
  activeValue?: string;
  ariaLabel: string;
  className?: string;
  linkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
  }>;
}

/**
 * Barra de chips de filtro por tipo — extraída de `/acervo` (Estágio 1) para
 * reuso em `/acervo/pesquisar` e `/acervo/descobrir`. Cada item já traz seu
 * próprio `href` (a página decide a query string); o componente só cuida da
 * apresentação e do estado ativo.
 */
export function FilterBar({
  items,
  activeValue,
  ariaLabel,
  className,
  linkComponent: Link = ({ href, className: linkClassName, children }) => (
    <a href={href} className={linkClassName}>
      {children}
    </a>
  ),
}: FilterBarProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)} aria-label={ariaLabel}>
      {items.map((item) => (
        <Link
          key={item.value}
          href={item.href}
          className={cn(
            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
            activeValue === item.value
              ? 'border-primary bg-primary text-white'
              : 'border-border text-muted hover:border-accent hover:text-foreground',
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
