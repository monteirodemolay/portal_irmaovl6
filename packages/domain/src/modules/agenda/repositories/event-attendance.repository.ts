import type { EventAttendance } from '../entities/event-attendance.entity';

export interface IEventAttendanceRepository {
  findByEventAndMember(eventId: string, memberId: string): Promise<EventAttendance | null>;
  listByEvent(eventId: string): Promise<EventAttendance[]>;
  /** Contagem para checagem de `capacidadeMaxima` — não requer carregar a lista inteira. */
  countConfirmedByEvent(eventId: string): Promise<number>;
  create(attendance: EventAttendance): Promise<void>;
  update(attendance: EventAttendance): Promise<void>;
}
