import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { EventAttendance } from '../entities/event-attendance.entity';
import type { IEventAttendanceRepository } from '../repositories/event-attendance.repository';

export interface ListEventAttendeesDeps {
  attendanceRepository: IEventAttendanceRepository;
}

/** Confirmações de presença de um evento (visão administrativa) — requer `event:read`. */
export class ListEventAttendeesUseCase {
  constructor(private readonly deps: ListEventAttendeesDeps) {}

  async execute(ctx: AuthContext, eventId: string): Promise<EventAttendance[]> {
    requirePermission(ctx, 'event:read');
    return this.deps.attendanceRepository.listByEvent(eventId);
  }
}
