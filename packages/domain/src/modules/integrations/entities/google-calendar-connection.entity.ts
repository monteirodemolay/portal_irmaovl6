import type { BaseEntity } from '../../../shared/base-entity';

/**
 * `connected`/`syncing`/`error` — a ausência de documento já significa "não
 * conectado"; "conectando" é um estado client-local durante o redirect
 * OAuth, nunca persistido aqui. Campo chamado `syncStatus` (não `status`)
 * para não colidir com `BaseEntity.status` (soft delete).
 */
export type GoogleSyncStatus = 'connected' | 'syncing' | 'error';

export interface GoogleCalendarConnectionPreferences {
  exibirEventosGoogle: boolean;
  sincronizarVL6ParaGoogle: boolean;
  sincronizarPessoalParaGoogle: boolean;
  detectarConflitos: boolean;
}

/**
 * Um documento por Irmão (`userId`) — mesmo padrão de `NotificationPreference`.
 * Tokens nunca em texto puro: `accessTokenEncrypted`/`refreshTokenEncrypted`
 * são cifrados via `ITokenCipher` (AES-256-GCM) antes de persistir.
 */
export interface GoogleCalendarConnection extends BaseEntity {
  userId: string;
  syncStatus: GoogleSyncStatus;
  googleAccountEmail: string | null;
  accessTokenEncrypted: string;
  accessTokenExpiresAt: Date;
  refreshTokenEncrypted: string;
  scope: string;
  /** `nextSyncToken` da Calendar API — sincronização incremental. */
  syncToken: string | null;
  /** Calendário Google de destino (`'primary'` por padrão). */
  calendarId: string;
  lastSyncedAt: Date | null;
  lastError: string | null;
  preferences: GoogleCalendarConnectionPreferences;
}
