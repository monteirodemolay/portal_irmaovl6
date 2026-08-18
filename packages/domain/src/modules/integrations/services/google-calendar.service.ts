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
  /**
   * `true` quando a busca foi uma listagem completa (sem `syncToken`, seja
   * na primeira sincronização ou após um HTTP 410) em vez de um delta
   * incremental. Uma listagem completa nunca devolve `status: 'cancelled'`
   * para itens removidos — o chamador precisa reconciliar o cache local
   * contra `changes` para detectar remoções.
   */
  isFullSync: boolean;
  /** Início da janela coberta pela listagem completa (`timeMin` enviado ao Google). `null` fora de uma listagem completa. */
  fullSyncFrom: Date | null;
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
