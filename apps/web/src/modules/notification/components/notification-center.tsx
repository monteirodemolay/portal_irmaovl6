'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import type { Notification } from '@vl6/domain';
import { NOTIFICATION_TYPE_LABELS } from '@vl6/shared';
import {
  Badge,
  Bell,
  Button,
  CheckCircle2,
  ChevronRight,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  cn,
} from '@vl6/ui';
import {
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
} from '../actions/notification-actions';

const MAX_PREVIEW = 5;

/**
 * Sino do topbar — prévia rápida, nunca substitui a Central de Avisos
 * (docs/architecture): só as `MAX_PREVIEW` mais recentes não lidas, ação de
 * "marcar todas como lidas" e um link pra `/avisos`. Abrir o sino nunca
 * marca nada como lido sozinho — só clicar num item específico faz isso.
 */
export function NotificationCenter({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const [isPending, startTransition] = useTransition();
  const preview = notifications.filter((n) => !n.lida && !n.archivedAt).slice(0, MAX_PREVIEW);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="relative h-10 w-10 rounded-full p-0"
          aria-label={`${unreadCount} notificações não lidas`}
        >
          <Bell size={18} strokeWidth={1.75} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 min-w-[18px] justify-center rounded-full px-1 py-0 text-[10px]"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <DialogTitle>Novidades para você</DialogTitle>
            <p className="text-muted text-xs">{unreadCount} não lidas</p>
          </div>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => startTransition(() => markAllNotificationsAsReadAction())}
            >
              <CheckCircle2 size={15} /> Marcar todas
            </Button>
          )}
        </DialogHeader>
        {preview.length === 0 ? (
          <EmptyState title="Nenhuma notificação nova" />
        ) : (
          <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto">
            {preview.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(() => markNotificationAsReadAction(notification.id))
                  }
                  className={cn(
                    'border-border hover:bg-surface flex w-full flex-col gap-0.5 rounded border p-3 text-left text-sm',
                    'bg-background',
                  )}
                >
                  <span className="text-accent text-[10px] font-semibold uppercase tracking-wide">
                    {NOTIFICATION_TYPE_LABELS[notification.tipo]}
                  </span>
                  <span className="font-medium">{notification.titulo}</span>
                  <span className="text-muted line-clamp-1 text-xs">{notification.mensagem}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/avisos"
          className="text-accent hover:text-primary-dark flex items-center justify-center gap-1 py-2 text-sm font-medium"
        >
          Abrir Central de Avisos <ChevronRight size={15} />
        </Link>
      </DialogContent>
    </Dialog>
  );
}
