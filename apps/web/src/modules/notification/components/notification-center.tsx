'use client';

import { useTransition } from 'react';
import type { Notification } from '@vl6/domain';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  cn,
} from '@vl6/ui';
import { markNotificationAsReadAction } from '../actions/notification-actions';

export function NotificationCenter({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          Notificações
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -right-2 -top-2">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notificações</DialogTitle>
        </DialogHeader>
        {notifications.length === 0 ? (
          <EmptyState title="Nenhuma notificação" />
        ) : (
          <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={cn(
                  'border-border rounded border p-3 text-sm',
                  !notification.lida && 'bg-background',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{notification.titulo}</p>
                    <p className="text-muted">{notification.mensagem}</p>
                  </div>
                  {!notification.lida && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(() => markNotificationAsReadAction(notification.id))
                      }
                    >
                      Marcar como lida
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
