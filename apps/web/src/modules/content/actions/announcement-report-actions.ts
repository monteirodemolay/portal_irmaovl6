'use server';

import { revalidatePath } from 'next/cache';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

const DEDUPE_PREFIX = (announcementId: string) => `announcement:${announcementId}:user:`;

export interface AnnouncementReachReport {
  total: number;
  lidas: number;
  requiresAcknowledgement: boolean;
  ciente: number;
  pendentes: { userId: string; nome: string }[];
}

/**
 * Alcance/leitura/ciência/pendências de um Aviso publicado — Fase 3 da
 * Central de Avisos (docs/architecture). Reconstrói o quadro a partir das
 * `Notification`s nascidas na publicação (mesmo `dedupeKey` prefixo
 * `announcement:{id}:user:`), sem precisar de uma entidade de campanha
 * separada.
 */
export async function getAnnouncementReachReportAction(
  announcementId: string,
): Promise<AnnouncementReachReport> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'notification:manage')) {
    throw new Error('Você não tem permissão para ver este relatório.');
  }

  const container = createServerContainer();
  const notifications = await container.repositories.notification.listByDedupeKeyPrefix(
    session.authContext.tenantId,
    DEDUPE_PREFIX(announcementId),
  );

  const requiresAcknowledgement = notifications.some((n) => n.requiresAcknowledgement);
  const lidas = notifications.filter((n) => n.lida).length;
  const ciente = notifications.filter((n) => n.acknowledgedAt !== null).length;
  const pendentesNotifications = requiresAcknowledgement
    ? notifications.filter((n) => !n.acknowledgedAt)
    : notifications.filter((n) => !n.lida);

  const members = await Promise.all(
    pendentesNotifications.map((n) =>
      container.repositories.member.findByUserId(session.authContext.tenantId, n.destinatarioId),
    ),
  );

  return {
    total: notifications.length,
    lidas,
    requiresAcknowledgement,
    ciente,
    pendentes: pendentesNotifications.map((n, index) => ({
      userId: n.destinatarioId,
      nome: members[index]?.nomeCompleto ?? '—',
    })),
  };
}

/**
 * "Reenviar lembrete só aos pendentes" — como o canal externo (e-mail/push)
 * ainda é Noop (docs/architecture), reenviar significa: volta a aparecer
 * como não lida (sino, Central, card da Dashboard) e sobe a prioridade
 * pra `urgent`, só pra quem ainda não leu/deu ciência. Nunca cria
 * notificação nova nem duplica — reaproveita a mesma, preservando o
 * histórico de quando foi originalmente disparada.
 */
export async function resendAnnouncementToPendingAction(announcementId: string): Promise<void> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'notification:manage')) {
    throw new Error('Você não tem permissão para reenviar este aviso.');
  }

  const container = createServerContainer();
  const announcement = await container.repositories.announcement.findById(announcementId);
  if (!announcement || announcement.tenantId !== session.authContext.tenantId) {
    throw new Error('Aviso não encontrado.');
  }

  const notifications = await container.repositories.notification.listByDedupeKeyPrefix(
    session.authContext.tenantId,
    DEDUPE_PREFIX(announcementId),
  );
  const pendentes = announcement.requiresAcknowledgement
    ? notifications.filter((n) => !n.acknowledgedAt)
    : notifications.filter((n) => !n.lida);

  const now = new Date();
  await Promise.all(
    pendentes.map((n) =>
      container.repositories.notification.update({
        ...n,
        lida: false,
        readAt: null,
        priority: 'urgent',
        updatedAt: now,
        updatedBy: session.authContext.uid,
      }),
    ),
  );

  revalidatePath('/', 'layout');
  revalidatePath(`/admin/conteudo/avisos/${announcementId}`);
}
