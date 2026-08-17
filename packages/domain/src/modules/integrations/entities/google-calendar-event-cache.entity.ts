import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Snapshot local de um evento importado do Google Agenda — populado só por
 * `LoadGoogleEventsUseCase` (sincronização incremental via `syncToken`), a
 * página "Minha Agenda" nunca chama a Calendar API a cada render.
 */
export interface GoogleCalendarEventCache extends BaseEntity {
  userId: string;
  googleEventId: string;
  titulo: string;
  local: string | null;
  inicio: Date;
  fim: Date;
}
