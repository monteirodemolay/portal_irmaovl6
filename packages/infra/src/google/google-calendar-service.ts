import {
  IntegrationNotConfiguredError,
  type GoogleCalendarEventChange,
  type GoogleCalendarEventInput,
  type GoogleCalendarSyncResult,
  type GoogleOAuthTokens,
  type IGoogleCalendarService,
} from '@vl6/domain';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const DEFAULT_SCOPES = 'https://www.googleapis.com/auth/calendar.events';

interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}

interface GoogleEventResource {
  id: string;
  status?: 'confirmed' | 'cancelled' | 'tentative';
  summary?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

interface GoogleEventsListResponse {
  items?: GoogleEventResource[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

/**
 * Implementação real do protocolo OAuth2 + Google Calendar API v3 via
 * `fetch` nativo (sem SDK `googleapis`, consistente com o resto do app).
 * Toda chamada externa é gateada por `getConfig()`: sem
 * `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_OAUTH_REDIRECT_URI`
 * configurados neste ambiente, lança `IntegrationNotConfiguredError` antes
 * de qualquer chamada de rede — os use cases traduzem isso no estado
 * `syncStatus: 'error'` com mensagem clara.
 */
export class GoogleCalendarService implements IGoogleCalendarService {
  private getConfig(): GoogleConfig {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new IntegrationNotConfiguredError('Google Calendar');
    }
    return {
      clientId,
      clientSecret,
      redirectUri,
      scopes: process.env.GOOGLE_CALENDAR_SCOPES ?? DEFAULT_SCOPES,
    };
  }

  buildAuthorizationUrl(state: string): string {
    const config = this.getConfig();
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<GoogleOAuthTokens> {
    const config = this.getConfig();
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    return this.parseTokenResponse(response);
  }

  async refreshAccessToken(refreshToken: string): Promise<GoogleOAuthTokens> {
    const config = this.getConfig();
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'refresh_token',
      }),
    });
    const tokens = await this.parseTokenResponse(response);
    // O Google não reemite `refresh_token` a cada renovação — preserva o original.
    return { ...tokens, refreshToken: tokens.refreshToken || refreshToken };
  }

  private async parseTokenResponse(response: Response): Promise<GoogleOAuthTokens> {
    if (!response.ok) {
      throw new Error(`Falha ao trocar tokens com o Google (HTTP ${response.status}).`);
    }
    const data = (await response.json()) as GoogleTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? '',
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope,
    };
  }

  async loadEvents(
    accessToken: string,
    calendarId: string,
    syncToken: string | null,
  ): Promise<GoogleCalendarSyncResult> {
    const params = new URLSearchParams({ singleEvents: 'true' });
    if (syncToken) {
      params.set('syncToken', syncToken);
    } else {
      params.set('timeMin', new Date().toISOString());
    }

    const changes: GoogleCalendarEventChange[] = [];
    let nextSyncToken: string | null = null;
    let pageToken: string | undefined;

    do {
      if (pageToken) params.set('pageToken', pageToken);
      const response = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!response.ok) {
        throw new Error(`Falha ao carregar eventos do Google (HTTP ${response.status}).`);
      }
      const data = (await response.json()) as GoogleEventsListResponse;
      for (const item of data.items ?? []) {
        changes.push(this.toChange(item));
      }
      pageToken = data.nextPageToken;
      if (data.nextSyncToken) nextSyncToken = data.nextSyncToken;
    } while (pageToken);

    return { changes, nextSyncToken };
  }

  private toChange(item: GoogleEventResource): GoogleCalendarEventChange {
    return {
      googleEventId: item.id,
      status: item.status === 'cancelled' ? 'cancelled' : 'confirmed',
      titulo: item.summary ?? '(sem título)',
      local: item.location ?? null,
      inicio: this.toDate(item.start),
      fim: this.toDate(item.end),
    };
  }

  private toDate(value: { dateTime?: string; date?: string } | undefined): Date {
    if (!value) return new Date();
    return new Date(value.dateTime ?? value.date ?? Date.now());
  }

  async createEvent(
    accessToken: string,
    calendarId: string,
    event: GoogleCalendarEventInput,
  ): Promise<string> {
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(this.toGoogleEventBody(event)),
      },
    );
    if (!response.ok) {
      throw new Error(`Falha ao criar evento no Google (HTTP ${response.status}).`);
    }
    const data = (await response.json()) as GoogleEventResource;
    return data.id;
  }

  async updateEvent(
    accessToken: string,
    calendarId: string,
    googleEventId: string,
    event: GoogleCalendarEventInput,
  ): Promise<void> {
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(this.toGoogleEventBody(event)),
      },
    );
    if (!response.ok) {
      throw new Error(`Falha ao atualizar evento no Google (HTTP ${response.status}).`);
    }
  }

  async deleteEvent(accessToken: string, calendarId: string, googleEventId: string): Promise<void> {
    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
    );
    // 404/410 = já removido no Google — idempotente, não é erro.
    if (!response.ok && response.status !== 404 && response.status !== 410) {
      throw new Error(`Falha ao remover evento no Google (HTTP ${response.status}).`);
    }
  }

  async revokeToken(token: string): Promise<void> {
    await fetch(`${REVOKE_URL}?token=${encodeURIComponent(token)}`, { method: 'POST' });
  }

  private toGoogleEventBody(event: GoogleCalendarEventInput) {
    return {
      summary: event.titulo,
      description: event.descricao ?? undefined,
      location: event.local ?? undefined,
      start: { dateTime: event.inicio.toISOString() },
      end: { dateTime: event.fim.toISOString() },
    };
  }
}
