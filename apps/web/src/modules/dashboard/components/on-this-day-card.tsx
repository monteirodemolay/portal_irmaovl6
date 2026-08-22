import Link from 'next/link';
import { Card, Compass } from '@vl6/ui';
import type { OnThisDayResult } from '@/modules/archive/lib/find-on-this-day-archive-item';
import { DashboardSectionHeading } from './dashboard-section-heading';

/**
 * "Aconteceu neste dia" — card do Dashboard (proposta fora do pedido
 * original, Fase A "Pessoas & Descoberta"). Só renderiza quando há um
 * evento real batendo com a data de hoje; nunca aparece vazio.
 */
export function OnThisDayCard({ entry }: { entry: OnThisDayResult }) {
  const anosLabel = entry.anosAtras === 1 ? 'Há 1 ano' : `Há ${entry.anosAtras} anos`;

  return (
    <Card className="flex flex-col gap-4 p-5 shadow-none">
      <DashboardSectionHeading icon={Compass} title="Aconteceu neste dia" />
      <Link
        href={`/acervo/eventos/${entry.eventId}`}
        className="group flex items-center gap-4 rounded-lg"
      >
        {entry.coverSrc ? (
          <img
            src={entry.coverSrc}
            alt={entry.titulo}
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="bg-surface flex h-16 w-16 shrink-0 items-center justify-center rounded-lg">
            <Compass size={22} className="text-muted" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <span className="text-accent text-[10px] font-semibold uppercase tracking-wider">
            {anosLabel}
          </span>
          <p className="font-display group-hover:text-accent font-semibold leading-snug transition-colors">
            {entry.titulo}
          </p>
          <p className="text-muted text-xs">{entry.local}</p>
        </div>
      </Link>
    </Card>
  );
}
