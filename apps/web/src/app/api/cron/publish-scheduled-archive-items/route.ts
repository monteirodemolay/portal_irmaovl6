import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@vl6/shared';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { withApiLogging } from '@/lib/api/with-api-logging';
import { requireCronSecret } from '@/lib/api/require-cron-secret';

const ROUTE = 'GET /api/cron/publish-scheduled-archive-items';

/**
 * Publica automaticamente todo `ArchiveItem` cujo agendamento
 * (`ScheduleArchiveItemPublicationUseCase`, passo "Organizar/Publicar" da
 * Central de Publicação) já venceu — Fase B "Publicação avançada",
 * docs/architecture/11-acervo-vl6.md. Disparado por Vercel Cron, mesmo
 * padrão de `/api/cron/birthday-reminder`: varre todos os tenants direto no
 * Firestore (sem `listAll` em `ITenantRepository`, deliberado) e chama
 * `PublishScheduledArchiveItemsUseCase.execute` uma vez por tenant, com um
 * `AuthContext` de sistema (`archiveItem:publish`).
 */
export const GET = withApiLogging(ROUTE, async (request: NextRequest) => {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  const db = getAdminFirestore();
  const container = createServerContainer();

  const tenantsSnap = await db.collection('tenants').get();
  let publicados = 0;
  let falhas = 0;

  for (const tenantDoc of tenantsSnap.docs) {
    const tenantId = tenantDoc.id;
    const systemCtx = {
      uid: 'system',
      tenantId,
      roleId: 'system',
      permissions: ['archiveItem:publish' as const],
    };

    const result = await container.useCases.publishScheduledArchiveItems.execute(systemCtx);
    if (result.ok) {
      publicados += result.value.publicados.length;
      falhas += result.value.falhas.length;
      for (const falha of result.value.falhas) {
        logger.error('Falha ao publicar item agendado do Acervo', {
          route: ROUTE,
          tenantId,
          archiveItemId: falha.archiveItemId,
          error: falha.error,
        });
      }
    }
  }

  logger.info('Itens agendados do Acervo publicados', { route: ROUTE, publicados, falhas });
  return NextResponse.json({ publicados, falhas });
});
