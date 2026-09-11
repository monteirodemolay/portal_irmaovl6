'use server';

import { createServerContainer } from '@vl6/infra';
import type { NotificationPriority } from '@vl6/shared';
import { requireSession } from '@/lib/auth/require-session';

export interface MemberSearchResultForNotification {
  id: string;
  nomeCompleto: string;
  fotoUrl: string | null;
  temAcesso: boolean;
}

export async function searchMembersForNotificationAction(
  query: string,
): Promise<MemberSearchResultForNotification[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const session = await requireSession();
  const container = createServerContainer();
  const page = await container.useCases.searchMembers.execute(
    session.authContext,
    { nome: trimmed },
    { limit: 20 },
  );
  return page.items.map((member) => ({
    id: member.id,
    nomeCompleto: member.nomeCompleto,
    fotoUrl: member.fotoUrl,
    temAcesso: member.userId !== null,
  }));
}

export type SendTargetedNotificationActionResult =
  | { ok: true; enviadas: number; semAcesso: { id: string; nomeCompleto: string }[] }
  | { ok: false; error: string };

/**
 * Envio manual de notificação pessoal — pedido explícito: "deixe pelo
 * back-end uma forma de enviar Notificações pessoais para determinado
 * irmão ou um grupo de irmãos, afim de cumprir determinado propósito".
 */
export async function sendTargetedNotificationAction(input: {
  memberIds: string[];
  titulo: string;
  mensagem: string;
  link?: string | null;
  priority?: NotificationPriority;
  requiresAcknowledgement?: boolean;
}): Promise<SendTargetedNotificationActionResult> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.sendTargetedNotification.execute(
    session.authContext,
    input,
  );
  if (!result.ok) {
    return { ok: false, error: result.error.message };
  }
  return { ok: true, enviadas: result.value.enviadas, semAcesso: result.value.semAcesso };
}
