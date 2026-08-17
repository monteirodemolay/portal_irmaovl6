import type { GoogleCalendarConnection } from '../entities/google-calendar-connection.entity';

export interface IGoogleCalendarConnectionRepository {
  findByUserId(tenantId: string, userId: string): Promise<GoogleCalendarConnection | null>;
  create(connection: GoogleCalendarConnection): Promise<void>;
  update(connection: GoogleCalendarConnection): Promise<void>;
  /** Exclusão física, deliberada — ausência de documento = "não conectado". */
  delete(id: string): Promise<void>;
}
