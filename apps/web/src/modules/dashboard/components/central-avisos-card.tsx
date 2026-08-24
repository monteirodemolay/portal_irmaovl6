import Link from 'next/link';
import type { Notification } from '@vl6/domain';
import { NOTIFICATION_TYPE_LABELS } from '@vl6/shared';
import { Archive, Bell, CalendarDays, Card, FileText, Megaphone, ShieldCheck } from '@vl6/ui';
import { DashboardSectionHeading } from './dashboard-section-heading';

const TYPE_ICON: Record<Notification['tipo'], React.ComponentType<{ size?: number }>> = {
  announcement: Megaphone,
  event: CalendarDays,
  news: FileText,
  file: FileText,
  acervo: Archive,
  system: ShieldCheck,
};

/**
 * Complementa a Dashboard (não substitui `AvisosCard`) — mostra até 3
 * notificações não lidas mais recentes, avisos oficiais e automáticas
 * juntos, sem misturar a Agenda (docs/architecture). "Ver a Central" leva
 * pra `/avisos`, mesma rota do item de menu e do sino.
 */
export function CentralAvisosCard({ notifications }: { notifications: Notification[] }) {
  const unread = notifications.filter((n) => !n.lida && !n.archivedAt).slice(0, 3);

  if (unread.length === 0) return null;

  return (
    <Card className="flex flex-col gap-4 p-5 shadow-none">
      <DashboardSectionHeading
        icon={Bell}
        title="Central de Avisos"
        href="/avisos"
        hrefLabel="Ver a Central"
      />
      <ul className="flex flex-col gap-2">
        {unread.map((notification) => {
          const Icon = TYPE_ICON[notification.tipo];
          return (
            <li key={notification.id}>
              <Link
                href="/avisos"
                className="border-border hover:bg-surface flex items-start gap-3 rounded-lg border p-3 transition-colors"
              >
                <span className="bg-accent/15 text-accent mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <Icon size={16} />
                </span>
                <div className="min-w-0">
                  <p className="text-muted text-[11px]">
                    {NOTIFICATION_TYPE_LABELS[notification.tipo]}
                  </p>
                  <p className="truncate text-sm font-medium">{notification.titulo}</p>
                  <p className="text-muted line-clamp-1 text-xs">{notification.mensagem}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
