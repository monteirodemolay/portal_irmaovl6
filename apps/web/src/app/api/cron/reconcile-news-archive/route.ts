import { NextResponse, type NextRequest } from 'next/server';
import type { AuthContext } from '@vl6/domain';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { logger } from '@vl6/shared';
import { requireCronSecret } from '@/lib/api/require-cron-secret';
import { withApiLogging } from '@/lib/api/with-api-logging';
import { reconcilePublishedNewsArchive } from '@/lib/content/reconcile-news-archive';

const ROUTE = 'GET /api/cron/reconcile-news-archive';

export const maxDuration = 300;

/**
 * Auto-reparo recorrente da cadeia Notícias → Eventos → Acervo. Notícias
 * publicadas sem eventId só são vinculadas quando título + proximidade de
 * data produzem correspondência inequívoca. Registros ambíguos ficam no
 * relatório; a rotina nunca inventa data/local ou cria Evento fictício.
 */
export const GET = withApiLogging(ROUTE, async (request: NextRequest) => {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  const db = getAdminFirestore();
  const container = createServerContainer();
  const tenants = await db.collection('tenants').get();

  const totals = {
    tenants: 0,
    scanned: 0,
    alreadySynced: 0,
    autoLinked: 0,
    synced: 0,
    unresolved: 0,
    importedMedia: 0,
    skippedMedia: 0,
    errors: 0,
  };

  for (const tenantDoc of tenants.docs) {
    const authContext: AuthContext = {
      uid: 'system:news-archive-reconciler',
      tenantId: tenantDoc.id,
      roleId: 'system',
      permissions: [
        'event:read',
        'news:read',
        'news:update',
        'archiveItem:create',
        'archiveItem:update',
        'archiveItem:publish',
        'archiveMedia:create',
        'mediaAsset:create',
      ],
    };

    const report = await reconcilePublishedNewsArchive(container, authContext);
    totals.tenants += 1;
    totals.scanned += report.scanned;
    totals.alreadySynced += report.alreadySynced;
    totals.autoLinked += report.autoLinked;
    totals.synced += report.synced;
    totals.unresolved += report.unresolved;
    totals.importedMedia += report.importedMedia;
    totals.skippedMedia += report.skippedMedia;
    totals.errors += report.errors.length;

    for (const error of report.errors) {
      logger.error('Falha ao reconciliar notícia com Acervo', {
        route: ROUTE,
        tenantId: tenantDoc.id,
        newsId: error.newsId,
        titulo: error.titulo,
        error: error.message,
      });
    }
  }

  logger.info('Reconciliação automática Notícias → Acervo concluída', { route: ROUTE, ...totals });
  return NextResponse.json(totals);
});
