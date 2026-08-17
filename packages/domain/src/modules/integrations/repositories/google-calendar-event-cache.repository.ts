import type { GoogleCalendarEventCache } from '../entities/google-calendar-event-cache.entity';

export interface IGoogleCalendarEventCacheRepository {
  listByUser(tenantId: string, userId: string): Promise<GoogleCalendarEventCache[]>;
  upsert(event: GoogleCalendarEventCache): Promise<void>;
  deleteByGoogleEventId(tenantId: string, userId: string, googleEventId: string): Promise<void>;
}
