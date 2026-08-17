export interface GoogleOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

export interface GoogleCalendarEventInput {
  titulo: string;
  descricao: string | null;
  local: string | null;
  inicio: Date;
  fim: Date;
}

export interface GoogleCalendarEventChange {
  googleEventId: string;
  /** `cancelled` = removido no Google desde o último `syncToken`. */
  status: 'confirmed' | 'cancelled';
  titulo: string;
  local: string | null;
  inicio: Date;
  fim: Date;
}

export interface GoogleCalendarSyncResult {
  changes: GoogleCalendarEventChange[];
  /** `null` quando a API não devolveu um token novo (sincronização completa a refazer). */
  nextSyncToken: string | null;
}

/**
 * Port do protocolo OAuth2 + Google Calendar API v3. Implementação real em
 * `packages/infra/src/google/google-calendar-service.ts` (fetch nativo, sem
 * SDK `googleapis`) — cada método lança `IntegrationNotConfiguredError`
 * quando `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` não estão configurados
 * neste ambiente.
 */
export interface IGoogleCalendarService {
  buildAuthorizationUrl(state: string): string;
  exchangeCodeForTokens(code: string): Promise<GoogleOAuthTokens>;
  refreshAccessToken(refreshToken: string): Promise<GoogleOAuthTokens>;
  loadEvents(
    accessToken: string,
    calendarId: string,
    syncToken: string | null,
  ): Promise<GoogleCalendarSyncResult>;
  createEvent(
    accessToken: string,
    calendarId: string,
    event: GoogleCalendarEventInput,
  ): Promise<string>;
  updateEvent(
    accessToken: string,
    calendarId: string,
    googleEventId: string,
    event: GoogleCalendarEventInput,
  ): Promise<void>;
  deleteEvent(accessToken: string, calendarId: string, googleEventId: string): Promise<void>;
  revokeToken(token: string): Promise<void>;
}
