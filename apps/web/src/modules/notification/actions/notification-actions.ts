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
