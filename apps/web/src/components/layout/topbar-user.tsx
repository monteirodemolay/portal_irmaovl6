import Link from 'next/link';
import type { Notification } from '@vl6/domain';
import type { MemberDegree } from '@vl6/shared';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';
import { LogoutButton } from '@/modules/identity-access/components/logout-button';
import { NotificationCenter } from '@/modules/notification/components/notification-center';

export function TopbarUser({
  displayName,
  fotoUrl,
  roleLabel,
  email,
  grau,
  notifications,
  unreadCount,
}: {
  displayName: string;
  fotoUrl?: string | null;
  roleLabel: string;
  email: string;
  grau: MemberDegree | null;
  notifications: Notification[];
  unreadCount: number;
}) {
  return (
    <>
      <NotificationCenter notifications={notifications} unreadCount={unreadCount} />
      <Link
        href="/irmaos/meu-espaco"
        className="hover:bg-background hidden items-center gap-2 rounded-lg p-1 transition-colors sm:flex"
      >
        <MemberAvatar fotoUrl={fotoUrl ?? null} nome={displayName} />
        <div className="leading-tight">
          <p className="max-w-[160px] truncate text-sm font-medium">{displayName}</p>
          {grau && <MemberDegreeBadge grau={grau} compact size="xs" className="my-0.5" />}
          <p className="text-muted truncate text-xs" title={email}>
            {roleLabel}
          </p>
        </div>
      </Link>
      <LogoutButton />
    </>
  );
}
