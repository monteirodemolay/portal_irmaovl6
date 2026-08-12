import type { Notification } from '@vl6/domain';
import { Avatar, AvatarFallback } from '@vl6/ui';
import { LogoutButton } from '@/modules/identity-access/components/logout-button';
import { NotificationCenter } from '@/modules/notification/components/notification-center';

export function TopbarUser({
  displayName,
  roleLabel,
  email,
  notifications,
  unreadCount,
}: {
  displayName: string;
  roleLabel: string;
  email: string;
  notifications: Notification[];
  unreadCount: number;
}) {
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      <NotificationCenter notifications={notifications} unreadCount={unreadCount} />
      <div className="hidden items-center gap-2 sm:flex">
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
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
