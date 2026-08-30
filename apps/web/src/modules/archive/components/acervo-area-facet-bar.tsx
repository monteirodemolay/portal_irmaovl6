import Link from 'next/link';
import type { AreaAtuacaoKey } from '@vl6/shared';
import { AREA_ATUACAO_ICONS } from '@/modules/central/lib/area-atuacao-icons';

export interface AcervoAreaFacet {
  key: AreaAtuacaoKey;
  label: string;
  count: number;
}

/**
 * Facetas de área de atuação na listagem "Pessoas" do Acervo VL6 — Fase E,
 * busca cruzada (docs/architecture, princípio da Cadeia de União). Mesmo
 * padrão visual de `AreaExploreGrid` do Diretório, mas linkando dentro do
 * próprio Acervo (`/acervo/pessoas?area=...`) — o dado só existe aqui
 * porque o Irmão publicou o bloco "profissional" na Central.
 */
export function AcervoAreaFacetBar({
  areaFacets,
  activeArea,
}: {
  areaFacets: AcervoAreaFacet[];
  activeArea?: string;
}) {
  if (areaFacets.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold">Explore por área profissional</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {areaFacets.map((area) => {
          const Icon = AREA_ATUACAO_ICONS[area.key];
          const active = activeArea === area.key;
          return (
            <Link
              key={area.key}
              href={active ? '/acervo/pessoas' : `/acervo/pessoas?area=${area.key}`}
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
    </div>
  );
}
