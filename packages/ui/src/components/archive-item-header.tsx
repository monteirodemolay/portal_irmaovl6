import * as React from 'react';
import { cn } from '../lib/cn';

export interface ArchiveItemHeaderProps {
  kindLabel: string;
  icon?: React.ReactNode;
  titulo: string;
  descricao?: string | null;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Cabeçalho da página canônica "Item do Acervo" (`/acervo/item/[id]`) —
 * mesmo vocabulário visual do `ArchiveItemCard`, em escala de página cheia.
 * `actions` recebe os botões de visualizar/baixar/voltar à rota legada.
 */
export function ArchiveItemHeader({
  kindLabel,
  icon,
  titulo,
  descricao,
  actions,
  className,
}: ArchiveItemHeaderProps) {
  return (
    <header
      className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className="min-w-0">
        <div className="text-accent flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest">
          {icon}
          {kindLabel}
        </div>
        <h1 className="font-display mt-2 text-2xl font-semibold leading-tight sm:text-3xl">
          {titulo}
        </h1>
        {descricao && <p className="text-muted mt-2 max-w-2xl text-sm leading-6">{descricao}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
