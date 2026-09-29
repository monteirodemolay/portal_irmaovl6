'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/require-session';
import { rotateCalendarFeedToken } from '@/lib/agenda/calendar-feed-token';

export async function rotateCalendarFeedTokenAction(): Promise<void> {
  const session = await requireSession();
  await rotateCalendarFeedToken(session.authContext.tenantId, session.authContext.uid);
  revalidatePath('/agenda');
}
