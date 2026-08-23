import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  loadMostViewedArchiveItemsAction,
  loadRecentArchiveActivityAction,
  loadStorageUsageByBoardTermAction,
} from '@/modules/archive/actions/metrics-actions';
import { ArchiveMetricsPanel } from '@/modules/archive/components/archive-metrics-panel';

/**
 * Administração & métricas do Acervo VL6 — Fase C
 * (docs/architecture/11-acervo-vl6.md). Três seções: itens mais vistos,
 * atividade recente (auditoria) e uso de armazenamento por Gestão. Gate na
 * permissão mais restrita das três (`archiveMedia:manage`, exigida pelo
 * uso de armazenamento) — quem não administra mídia do Acervo não deveria
 * ver estes números administrativos.
 */
export default async function AcervoMetricasPage() {
  await requirePagePermission('archiveMedia:manage');

  const [mostViewed, recentActivity, storageUsage] = await Promise.all([
    loadMostViewedArchiveItemsAction(),
    loadRecentArchiveActivityAction(),
    loadStorageUsageByBoardTermAction(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Métricas do Acervo</h1>
        <p className="text-muted max-w-lg text-sm">
          Itens mais visualizados, atividade recente e uso de armazenamento por Gestão.
        </p>
      </div>
      <ArchiveMetricsPanel
        mostViewed={mostViewed}
        recentActivity={recentActivity}
        storageUsage={storageUsage}
      />
    </div>
  );
}
