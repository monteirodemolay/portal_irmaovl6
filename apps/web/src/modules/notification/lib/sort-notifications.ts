import type { Notification } from '@vl6/domain';

/**
 * Ordem padrão de toda listagem de notificações do Portal (sino e Central
 * de Avisos) — pedido explícito: "Não Lidas" sempre primeiro. Dentro de
 * cada grupo (não lidas / lidas), mais recente primeiro.
 */
export function sortNotificationsUnreadFirst(notifications: Notification[]): Notification[] {
  return [...notifications].sort((a, b) => {
    if (a.lida !== b.lida) return a.lida ? 1 : -1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
