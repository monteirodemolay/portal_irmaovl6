import type { DirectoryMetrics } from '@vl6/domain';
import { Briefcase, Building2, Sparkles, Users } from '@vl6/ui';

const TILES = [
  { key: 'totalIrmaos', label: 'Irmãos participantes', icon: Users },
  { key: 'totalAreas', label: 'Áreas de atuação', icon: Briefcase },
  { key: 'totalEmpresas', label: 'Empresas cadastradas', icon: Building2 },
  { key: 'totalCompetenciasCompartilhadas', label: 'Competências compartilhadas', icon: Sparkles },
] as const;

export function DirectoryMetricsPanel({ metrics }: { metrics: DirectoryMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {TILES.map((tile) => (
        <div
          key={tile.key}
          className="border-border bg-surface flex min-h-[94px] items-center gap-3.5 rounded-xl border p-4"
        >
          <span className="bg-primary text-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
            <tile.icon size={20} strokeWidth={1.75} />
          </span>
          <div>
            <p className="font-display text-xl font-bold">{metrics[tile.key]}</p>
            <p className="text-muted text-xs">{tile.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
