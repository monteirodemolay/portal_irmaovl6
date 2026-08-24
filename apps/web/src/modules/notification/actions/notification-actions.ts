'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export async function markNotificationAsReadAction(notificationId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.markNotificationAsRead.execute(
    session.authContext,
    notificationId,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/', 'layout');
}

export async function markNotificationAsUnreadAction(notificationId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.markNotificationAsUnread.execute(
    session.authContext,
    notificationId,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/', 'layout');
}

export async function toggleNotificationImportantAction(notificationId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.toggleNotificationImportant.execute(
    session.authContext,
    notificationId,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/', 'layout');
}

export async function toggleNotificationArchivedAction(notificationId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.toggleNotificationArchived.execute(
    session.authContext,
    notificationId,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/', 'layout');
}

export async function acknowledgeNotificationAction(notificationId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.acknowledgeNotification.execute(
    session.authContext,
    notificationId,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/', 'layout');
}

/** "Marcar todas como lidas" — sino e Central de Avisos. */
export async function markAllNotificationsAsReadAction(): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const page = await container.useCases.listMyNotifications.execute(session.authContext, {
    limit: 200,
  });
  const unread = page.items.filter((notification) => !notification.lida);

  await Promise.all(
    unread.map((notification) =>
      container.useCases.markNotificationAsRead.execute(session.authContext, notification.id),
    ),
  );

  revalidatePath('/', 'layout');
}
