import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

export interface PaginationProps {
  hasPrevious: boolean;
  hasNext: boolean;
  previousHref: string;
  nextHref: string;
  /** Texto livre à esquerda (ex.: "Página 2", "50 Irmãos nesta página"). */
  label?: React.ReactNode;
}

/**
 * Paginação por cursor (anterior/próxima) — não é offset-based, então não
 * há "ir para a página N": só navega um passo por vez, o que já cobre bem
 * listagens administrativas (ver docs/architecture/05 e a página de
 * Irmãos, primeiro consumidor). `previousHref`/`nextHref` são strings
 * prontas (a página monta a URL com cursor/filtros); quando o respectivo
 * `has*` é falso, o botão fica desabilitado em vez de virar link.
 */
export function Pagination({
  hasPrevious,
  hasNext,
  previousHref,
  nextHref,
  label,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-muted text-sm">{label}</div>
      <div className="flex items-center gap-2">
        {hasPrevious ? (
          <Button asChild variant="outline" size="sm">
            <a href={previousHref}>
              <ChevronLeft size={16} /> Anterior
            </a>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft size={16} /> Anterior
          </Button>
        )}
        {hasNext ? (
          <Button asChild variant="outline" size="sm">
            <a href={nextHref}>
              Próxima <ChevronRight size={16} />
            </a>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Próxima <ChevronRight size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
