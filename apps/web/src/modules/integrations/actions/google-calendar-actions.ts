'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface GoogleCalendarActionState {
  error: string | null;
}

export interface SyncGoogleCalendarResult {
  ok: boolean;
  error: string | null;
}

/** `disconnectGoogleCalendar()` — só os dois hops do OAuth (start/callback) são Route Handlers; o resto é Server Action. */
export async function disconnectGoogleCalendarAction(): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.disconnectGoogleCalendar.execute(session.authContext);
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/agenda');
}

/** `loadGoogleEvents()` — botão "Sincronizar agora". */
export async function syncGoogleCalendarNowAction(): Promise<SyncGoogleCalendarResult> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.loadGoogleEvents.execute(session.authContext);

  revalidatePath('/agenda');
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, error: null };
}

export async function updateGoogleCalendarPreferencesAction(
  _prevState: GoogleCalendarActionState,
  formData: FormData,
): Promise<GoogleCalendarActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const preferences = {
    exibirEventosGoogle: formData.get('exibirEventosGoogle') === 'on',
    sincronizarVL6ParaGoogle: formData.get('sincronizarVL6ParaGoogle') === 'on',
    sincronizarPessoalParaGoogle: formData.get('sincronizarPessoalParaGoogle') === 'on',
    detectarConflitos: formData.get('detectarConflitos') === 'on',
  };
  const calendarId = String(formData.get('calendarId') || 'primary');

  const result = await container.useCases.updateGoogleCalendarPreferences.execute(
    session.authContext,
    { preferences, calendarId },
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/agenda');
  return { error: null };
}
