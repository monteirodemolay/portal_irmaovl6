import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@vl6/shared';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { withApiLogging } from '@/lib/api/with-api-logging';
import { requireCronSecret } from '@/lib/api/require-cron-secret';
import { notifyAllActiveUsers } from '@/modules/notification/lib/notify-all-active-users';

const ROUTE = 'GET /api/cron/notification-daily-tasks';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Job diário único da Central de Avisos (Vercel Cron, plano Hobby — só
 * roda 1x/dia, ver docs/architecture) — varre todos os tenants (mesmo
 * padrão de `/api/cron/birthday-reminder`) e faz:
 *
 * 1. Lembrete de sessão no dia — uma notificação por Evento de hoje pra
 *    cada usuário ativo, com `dedupeKey` por evento+dia+usuário (nunca
 *    duplica em reexecuções). Quando o Evento exige confirmação de
 *    presença, a notificação já nasce com `requiresAcknowledgement` e um
 *    botão de ação — cobre também o item "pendência de confirmação de
 *    presença" do escopo, sem precisar de um segundo tipo de notificação.
 * 2. Arquivamento de notificações com `expiresAt` vencido
 *    (`ArchiveExpiredNotificationsUseCase`).
 *
 * Resumo semanal (explicitamente opcional no escopo) e notificação
 * separada de aniversário (o evento de aniversário já aparece na Linha do
 * Tempo via `/api/cron/birthday-reminder`) ficam fora deste job por
 * decisão de escopo.
 */
export const GET = withApiLogging(ROUTE, async (request: NextRequest) => {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  const db = getAdminFirestore();
  const container = createServerContainer();
  const now = new Date();
  const today = isoDate(now);

  const tenantsSnap = await db.collection('tenants').get();
  let sessionRemindersSent = 0;
  let notificationsArchived = 0;

  for (const tenantDoc of tenantsSnap.docs) {
    const tenantId = tenantDoc.id;

    const eventsToday = await container.repositories.event.listInRange(
      tenantId,
      startOfDay(now),
      endOfDay(now),
    );

    for (const event of eventsToday) {
      if (event.deletedAt) continue;
      await notifyAllActiveUsers(container, tenantId, {
        tipo: 'event',
        titulo: `Lembrete: ${event.titulo} é hoje`,
        mensagem: `${event.local} — não perca.`,
        link: '/agenda',
        requiresAcknowledgement: event.exigeConfirmacaoPresenca,
        actionLabel: event.exigeConfirmacaoPresenca ? 'Confirmar presença' : undefined,
        dedupeKey: (userId) => `event:${event.id}:day-of:${today}:user:${userId}`,
      });
      sessionRemindersSent += 1;
    }

    notificationsArchived += await container.useCases.archiveExpiredNotifications.execute(tenantId);
  }

  logger.info('Job diário da Central de Avisos concluído', {
    route: ROUTE,
    sessionRemindersSent,
    notificationsArchived,
  });
  return NextResponse.json({ sessionRemindersSent, notificationsArchived });
});
