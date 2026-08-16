import * as React from 'react';
import { cn } from '../lib/cn';

export interface ConstellationNode {
  key: string;
  label: string;
  kindLabel: string;
  href: string;
}

export interface ConstellationEdge {
  relationLabel: string;
  descricao?: string | null;
  node: ConstellationNode;
}

export interface ConstellationGraphProps {
  centerLabel: string;
  centerKindLabel: string;
  edges: ConstellationEdge[];
  className?: string;
  /** Máximo de nós desenhados no diagrama — o restante só aparece na lista. */
  maxGraphNodes?: number;
  linkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    children: React.ReactNode;
  }>;
}

const VIEW_SIZE = 320;
const CENTER = VIEW_SIZE / 2;
const RADIUS = 120;

/**
 * Constelação da Memória (docs/architecture/11-acervo-vl6.md §11.6d). O SVG
 * é puramente decorativo (`aria-hidden`, layout determinístico, sem
 * animação nem simulação em JS) — a lista abaixo é a fonte real de
 * informação e SEMPRE acompanha o desenho, nunca o contrário: nenhum dado
 * existe só no gráfico.
 */
export function ConstellationGraph({
  centerLabel,
  centerKindLabel,
  edges,
  className,
  maxGraphNodes = 8,
  linkComponent: Link = ({ href, className: linkClassName, children }) => (
    <a href={href} className={linkClassName}>
      {children}
    </a>
  ),
}: ConstellationGraphProps) {
  if (edges.length === 0) return null;

  const graphEdges = edges.slice(0, maxGraphNodes);
  const overflowCount = edges.length - graphEdges.length;

  const points = graphEdges.map((edge, index) => {
    const angle = (2 * Math.PI * index) / graphEdges.length - Math.PI / 2;
    return {
      edge,
      x: CENTER + RADIUS * Math.cos(angle),
      y: CENTER + RADIUS * Math.sin(angle),
    };
  });

  return (
    <div className={cn('flex flex-col gap-5 sm:flex-row sm:items-start', className)}>
      <svg
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        role="img"
        aria-hidden="true"
        className="text-border h-auto w-full max-w-[320px] shrink-0 sm:w-64"
      >
        {points.map((point) => (
          <line
            key={`line-${point.edge.node.key}`}
            x1={CENTER}
            y1={CENTER}
            x2={point.x}
            y2={point.y}
            stroke="currentColor"
            strokeWidth={1}
          />
        ))}
        <circle cx={CENTER} cy={CENTER} r={10} className="fill-accent" />
        {points.map((point) => (
          <circle
            key={`dot-${point.edge.node.key}`}
            cx={point.x}
            cy={point.y}
            r={6}
            className="fill-primary"
          />
        ))}
      </svg>

      <div className="min-w-0 flex-1">
        <p className="text-muted text-[11px] font-semibold uppercase tracking-wide">
          {centerKindLabel} · {centerLabel}
        </p>
        <ul className="mt-2 flex flex-col gap-2">
          {edges.map((edge) => (
            <li key={edge.node.key} className="text-sm leading-5">
              <span className="text-muted">{edge.relationLabel}</span>{' '}
              <Link href={edge.node.href} className="text-accent font-medium hover:underline">
                {edge.node.label}
              </Link>
              <span className="text-muted"> ({edge.node.kindLabel})</span>
              {edge.descricao && <p className="text-muted text-xs">{edge.descricao}</p>}
            </li>
          ))}
        </ul>
        {overflowCount > 0 && (
          <p className="text-muted mt-2 text-xs">
            +{overflowCount} relação(ões) listada(s) acima, sem representação no diagrama.
          </p>
        )}
      </div>
    </div>
  );
}
