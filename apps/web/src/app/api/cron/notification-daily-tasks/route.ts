import { NextResponse, type NextRequest } from 'next/server';
import { isLibraryPickupExpired, type LibraryLoan, type LibraryLoanEventKind } from '@vl6/domain';
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
 * 3. Expurgo de verdade (exclusão física) das que já estão arquivadas há
 *    mais da folga de retenção (`PurgeExpiredNotificationsUseCase`) — a
 *    coleção não cresce pra sempre.
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
  let libraryPickupReservationsReleased = 0;
  let libraryOverdueLoansMarked = 0;
  let libraryOverdueRemindersSent = 0;
  let notificationsArchived = 0;
  let notificationsPurged = 0;

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

    const libraryLoans =
      await container.repositories.libraryCirculation.listLoansByTenant(tenantId);
    for (const loan of libraryLoans) {
      if (isLibraryPickupExpired(loan.statusEmprestimo, loan.pickupDeadlineAt, now)) {
        const updated: LibraryLoan = {
          ...loan,
          statusEmprestimo: 'cancelado',
          librarianNotes: 'Reserva liberada automaticamente: prazo de retirada expirado.',
          updatedAt: now,
          updatedBy: 'system',
        };
        await container.repositories.libraryCirculation.updateLoanAndCopy(updated, 'disponivel');
        await createLibraryLoanEvent(
          container,
          updated,
          'nao_retirado',
          'Reserva liberada automaticamente após o prazo de retirada.',
          now,
        );
        await container.useCases.notifyRecipient.execute({
          tenantId,
          destinatarioId: loan.borrowerUserId,
          tipo: 'acervo',
          titulo: 'Reserva de livro liberada',
          mensagem: 'O prazo para retirada terminou e o exemplar voltou a ficar disponível.',
          link: '/acervo/biblioteca/emprestimos',
          priority: 'attention',
          dedupeKey: `library-loan:${loan.id}:pickup-expired`,
        });
        libraryPickupReservationsReleased += 1;
        continue;
      }

      if (loan.statusEmprestimo === 'retirado' && loan.dueAt < now) {
        const updated: LibraryLoan = {
          ...loan,
          statusEmprestimo: 'atrasado',
          updatedAt: now,
          updatedBy: 'system',
        };
        await container.repositories.libraryCirculation.updateLoanAndCopy(updated, 'emprestado');
        await createLibraryLoanEvent(
          container,
          updated,
          'atraso',
          `Prazo de devolução encerrado em ${loan.dueAt.toLocaleDateString('pt-BR')}.`,
          now,
        );
        libraryOverdueLoansMarked += 1;
      }

      if (['retirado', 'atrasado'].includes(loan.statusEmprestimo) && loan.dueAt < now) {
        await container.useCases.notifyRecipient.execute({
          tenantId,
          destinatarioId: loan.borrowerUserId,
          tipo: 'acervo',
          titulo: 'Livro com devolução atrasada',
          mensagem: `O empréstimo venceu em ${loan.dueAt.toLocaleDateString('pt-BR')} e ainda não foi baixado pelo Bibliotecário.`,
          link: '/acervo/biblioteca/emprestimos',
          priority: 'urgent',
          dedupeKey: `library-loan:${loan.id}:overdue:${today}`,
        });
        libraryOverdueRemindersSent += 1;
      }
    }

    notificationsArchived += await container.useCases.archiveExpiredNotifications.execute(tenantId);
    notificationsPurged += await container.useCases.purgeExpiredNotifications.execute(tenantId);
  }

  logger.info('Job diário da Central de Avisos concluído', {
    route: ROUTE,
    sessionRemindersSent,
    libraryPickupReservationsReleased,
    libraryOverdueLoansMarked,
    libraryOverdueRemindersSent,
    notificationsArchived,
    notificationsPurged,
  });
  return NextResponse.json({
    sessionRemindersSent,
    libraryPickupReservationsReleased,
    libraryOverdueLoansMarked,
    libraryOverdueRemindersSent,
    notificationsArchived,
    notificationsPurged,
  });
});

async function createLibraryLoanEvent(
  container: ReturnType<typeof createServerContainer>,
  loan: LibraryLoan,
  tipo: LibraryLoanEventKind,
  descricao: string,
  occurredAt: Date,
) {
  const id = container.db.collection('libraryLoanEvents').doc().id;
  await container.repositories.libraryCirculation.createLoanEvent({
    id,
    tenantId: loan.tenantId,
    loanId: loan.id,
    libraryItemId: loan.libraryItemId,
    copyId: loan.copyId,
    tipo,
    descricao,
    actorUserId: 'system',
    occurredAt,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    createdBy: 'system',
    updatedBy: 'system',
    deletedAt: null,
    status: 'active',
    ativo: true,
  });
}
