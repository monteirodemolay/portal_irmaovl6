'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import type { Notification } from '@vl6/domain';
import { BRAZIL_TIME_ZONE, NOTIFICATION_TYPE_LABELS, type NotificationType } from '@vl6/shared';
import {
  Archive,
  Badge,
  Bell,
  Button,
  CalendarDays,
  CheckCircle2,
  EmptyState,
  FileText,
  Input,
  Megaphone,
  ShieldCheck,
  Star,
  cn,
} from '@vl6/ui';
import { normalizeSearchText } from '@/modules/archive/lib/archive-search-match';
import {
  acknowledgeNotificationAction,
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
  markNotificationAsUnreadAction,
  toggleNotificationArchivedAction,
  toggleNotificationImportantAction,
} from '../actions/notification-actions';

type Tab = 'all' | 'unread' | 'read' | 'important' | 'archived' | 'ack';

const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'unread', label: 'Não lidas' },
  { key: 'read', label: 'Lidas' },
  { key: 'important', label: 'Importantes' },
  { key: 'ack', label: 'Exigem ciência' },
  { key: 'archived', label: 'Arquivadas' },
];

const TYPE_ICON: Record<NotificationType, React.ComponentType<{ size?: number }>> = {
  announcement: Megaphone,
  event: CalendarDays,
  news: FileText,
  file: FileText,
  acervo: Archive,
  system: ShieldCheck,
};

function formatRelative(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: BRAZIL_TIME_ZONE,
  }).format(date);
}

/**
 * Central de Avisos completa (`/avisos`) — Avisos oficiais e notificações
 * automáticas do Portal reunidos, sem misturar Agenda (docs/architecture).
 * Lista + detalhe lado a lado no desktop, uma coluna no celular. Recebe
 * `notifications` como prop vinda do Server Component da página — as ações
 * chamam Server Actions que revalidam o layout, então a prop chega
 * atualizada sozinha, sem refetch manual daqui.
 */
export function CentralDeAvisos({ notifications }: { notifications: Notification[] }) {
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const counts = useMemo(
    () => ({
      all: notifications.filter((n) => !n.archivedAt).length,
      unread: notifications.filter((n) => !n.lida && !n.archivedAt).length,
      read: notifications.filter((n) => n.lida && !n.archivedAt).length,
      important: notifications.filter((n) => n.important && !n.archivedAt).length,
      archived: notifications.filter((n) => n.archivedAt).length,
      ack: notifications.filter(
        (n) => n.requiresAcknowledgement && !n.acknowledgedAt && !n.archivedAt,
      ).length,
    }),
    [notifications],
  );

  const filtered = useMemo(() => {
    const query = normalizeSearchText(search);
    return notifications
      .filter((n) => {
        if (tab === 'all') return !n.archivedAt;
        if (tab === 'unread') return !n.lida && !n.archivedAt;
        if (tab === 'read') return n.lida && !n.archivedAt;
        if (tab === 'important') return n.important && !n.archivedAt;
        if (tab === 'archived') return Boolean(n.archivedAt);
        if (tab === 'ack') return n.requiresAcknowledgement && !n.acknowledgedAt && !n.archivedAt;
        return true;
      })
      .filter((n) => {
        if (!query) return true;
        const haystack = normalizeSearchText(
          `${n.titulo} ${n.mensagem} ${NOTIFICATION_TYPE_LABELS[n.tipo]}`,
        );
        return haystack.includes(query);
      });
  }, [notifications, tab, search]);

  useEffect(() => {
    if (filtered.some((n) => n.id === selectedId)) return;
    setSelectedId(filtered[0]?.id ?? null);
  }, [filtered, selectedId]);

  const selected = filtered.find((n) => n.id === selectedId) ?? filtered[0] ?? null;

  function openNotice(id: string, lida: boolean) {
    setSelectedId(id);
    if (!lida) startTransition(() => markNotificationAsReadAction(id));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Buscar notificações…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
        />
        {counts.unread > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => startTransition(() => markAllNotificationsAsReadAction())}
          >
            <CheckCircle2 size={16} /> Marcar todas como lidas
          </Button>
        )}
      </div>

      <div className="border-border flex gap-1 overflow-x-auto border-b" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
              tab === item.key
                ? 'border-primary text-primary'
                : 'text-muted hover:text-foreground border-transparent',
            )}
          >
            {item.label}
            {counts[item.key] > 0 && (
              <span className="text-muted ml-1.5 text-xs">{counts[item.key]}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell size={22} />}
          title="Nenhuma notificação aqui"
          description="Você está em dia com esta lista."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <ul className="flex flex-col gap-1.5 lg:max-h-[70vh] lg:overflow-y-auto">
            {filtered.map((notification) => {
              const Icon = TYPE_ICON[notification.tipo];
              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => openNotice(notification.id, notification.lida)}
                    className={cn(
                      'border-border flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                      selected?.id === notification.id
                        ? 'border-accent bg-accent/5'
                        : 'hover:bg-surface',
                      !notification.lida && 'bg-background',
                    )}
                  >
                    <span className="bg-accent/15 text-accent mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-muted flex items-center gap-1.5 text-[11px]">
                        <span>{NOTIFICATION_TYPE_LABELS[notification.tipo]}</span>
                        <span>·</span>
                        <time>{formatRelative(notification.createdAt)}</time>
                      </span>
                      <span className="block truncate text-sm font-medium">
                        {notification.titulo}
                      </span>
                      <span className="text-muted line-clamp-1 block text-xs">
                        {notification.mensagem}
                      </span>
                      <span className="mt-1 flex items-center gap-2">
                        {notification.requiresAcknowledgement && !notification.acknowledgedAt && (
                          <Badge variant="warning">Ciência pendente</Badge>
                        )}
                        {notification.important && (
                          <span className="text-accent flex items-center gap-0.5 text-[11px]">
                            <Star size={11} /> Importante
                          </span>
                        )}
                      </span>
                    </span>
                    {!notification.lida && (
                      <span className="bg-accent mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {selected && (
            <NoticeDetail
              key={selected.id}
              notification={selected}
              startTransition={startTransition}
            />
          )}
        </div>
      )}
    </div>
  );
}

function NoticeDetail({
  notification,
  startTransition,
}: {
  notification: Notification;
  startTransition: (fn: () => void | Promise<void>) => void;
}) {
  const Icon = TYPE_ICON[notification.tipo];
  const needsAck = notification.requiresAcknowledgement && !notification.acknowledgedAt;

  return (
    <article className="border-border flex flex-col gap-4 rounded-lg border p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-accent flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
          <Icon size={16} /> {NOTIFICATION_TYPE_LABELS[notification.tipo]}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Importante"
            onClick={() =>
              startTransition(() => toggleNotificationImportantAction(notification.id))
            }
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
              notification.important ? 'bg-accent/15 text-accent' : 'text-muted hover:bg-surface',
            )}
          >
            <Star size={16} />
          </button>
          <button
            type="button"
            title={notification.archivedAt ? 'Restaurar' : 'Arquivar'}
            onClick={() => startTransition(() => toggleNotificationArchivedAction(notification.id))}
            className="text-muted hover:bg-surface flex h-8 w-8 items-center justify-center rounded-full"
          >
            <Archive size={16} />
          </button>
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold">{notification.titulo}</h2>
        <p className="text-muted mt-2 whitespace-pre-line text-sm">{notification.mensagem}</p>
      </div>

      {needsAck ? (
        <div className="border-accent/30 bg-accent/5 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <ShieldCheck size={20} className="text-accent shrink-0" />
            <div>
              <p className="text-sm font-semibold">Este comunicado exige sua ciência</p>
              <p className="text-muted text-xs">Confirme que tomou conhecimento.</p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => startTransition(() => acknowledgeNotificationAction(notification.id))}
          >
            <CheckCircle2 size={15} /> Estou ciente
          </Button>
        </div>
      ) : (
        notification.requiresAcknowledgement && (
          <p className="text-muted flex items-center gap-1.5 text-xs">
            <CheckCircle2 size={14} className="text-emerald-600" /> Ciência confirmada
          </p>
        )
      )}

      {notification.actionLabel && notification.link && (
        <a
          href={notification.link}
          className="border-border hover:bg-surface inline-flex w-fit items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium"
        >
          {notification.actionLabel}
        </a>
      )}

      <footer className="border-border text-muted flex items-center justify-between border-t pt-3 text-xs">
        <span>
          {notification.lida
            ? `Lida em ${formatRelative(notification.readAt ?? notification.updatedAt)}`
            : 'Não lida'}
        </span>
        {notification.lida && (
          <button
            type="button"
            onClick={() => startTransition(() => markNotificationAsUnreadAction(notification.id))}
            className="hover:text-foreground underline underline-offset-2"
          >
            Marcar como não lida
          </button>
        )}
      </footer>
    </article>
  );
}
