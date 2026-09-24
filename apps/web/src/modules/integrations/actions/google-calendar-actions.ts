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
  skipped?: boolean;
}

const AUTO_SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;

/** `disconnectGoogleCalendar()` — só os dois hops do OAuth (start/callback) são Route Handlers; o resto é Server Action. */
export async function disconnectGoogleCalendarAction(): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.disconnectGoogleCalendar.execute(session.authContext);
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/agenda');
}

/**
 * Sincronização automática ao abrir a Agenda. Não usa cron: só consulta o
 * Google quando a página é realmente aberta e a última sincronização tem
 * mais de cinco minutos. A checagem também acontece no servidor para evitar
 * chamadas duplicadas entre abas/recarregamentos quase simultâneos.
 */
export async function syncGoogleCalendarIfStaleAction(): Promise<SyncGoogleCalendarResult> {
  const session = await requireSession();
  const container = createServerContainer();
  const connection = await container.repositories.googleCalendarConnection.findByUserId(
    session.authContext.tenantId,
    session.authContext.uid,
  );

  if (!connection || !connection.preferences.exibirEventosGoogle) {
    return { ok: true, error: null, skipped: true };
  }

  const lastSyncedAt = connection.lastSyncedAt?.getTime() ?? 0;
  const isFresh = Date.now() - lastSyncedAt < AUTO_SYNC_MIN_INTERVAL_MS;
  if (isFresh || connection.syncStatus === 'syncing') {
    return { ok: true, error: null, skipped: true };
  }

  const result = await container.useCases.loadGoogleEvents.execute(session.authContext);
  revalidatePath('/agenda');
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, error: null, skipped: false };
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
