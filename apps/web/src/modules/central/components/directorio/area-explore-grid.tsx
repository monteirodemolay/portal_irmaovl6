import Link from 'next/link';
import type { AreaFacet } from '@vl6/domain';
import { AREA_ATUACAO_ICONS } from '../../lib/area-atuacao-icons';

export function AreaExploreGrid({
  areaFacets,
  activeArea,
}: {
  areaFacets: AreaFacet[];
  activeArea?: string;
}) {
  if (areaFacets.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      {areaFacets.map((area) => {
        const Icon = AREA_ATUACAO_ICONS[area.key];
        const active = activeArea === area.key;
        return (
          <Link
            key={area.key}
            href={active ? '/irmaos' : `/irmaos?areaAtuacao=${area.key}`}
            className={
              active
                ? 'border-accent bg-accent/10 flex items-center gap-2.5 rounded-xl border p-3 transition-colors'
                : 'border-border bg-surface hover:border-accent/60 flex items-center gap-2.5 rounded-xl border p-3 transition-colors hover:shadow-sm'
            }
          >
            <Icon size={20} className="text-accent shrink-0" strokeWidth={1.75} />
            <span className="min-w-0">
              <strong className="block truncate text-xs font-semibold">{area.label}</strong>
              <small className="text-muted block text-[10px]">
                {area.count} {area.count === 1 ? 'Irmão' : 'Irmãos'}
              </small>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
