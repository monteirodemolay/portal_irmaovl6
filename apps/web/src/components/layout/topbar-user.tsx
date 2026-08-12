import type { Notification } from '@vl6/domain';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { LogoutButton } from '@/modules/identity-access/components/logout-button';
import { NotificationCenter } from '@/modules/notification/components/notification-center';

export function TopbarUser({
  displayName,
  fotoUrl,
  roleLabel,
  email,
  notifications,
  unreadCount,
}: {
  displayName: string;
  fotoUrl?: string | null;
  roleLabel: string;
  email: string;
  notifications: Notification[];
  unreadCount: number;
}) {
  return (
    <>
      <NotificationCenter notifications={notifications} unreadCount={unreadCount} />
      <div className="hidden items-center gap-2 sm:flex">
        <MemberAvatar fotoUrl={fotoUrl ?? null} nome={displayName} />
        <div className="leading-tight">
          <p className="max-w-[160px] truncate text-sm font-medium">{displayName}</p>
          <p className="text-muted truncate text-xs" title={email}>
            {roleLabel}
          </p>
        </div>
      </div>
      <LogoutButton />
    </>
  );
}
