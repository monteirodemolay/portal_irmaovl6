import type { EventAttendanceStatus } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Campo `statusPresenca` (não `status`) para não colidir com
 * `BaseEntity.status`, que descreve o ciclo de vida do registro — mesma
 * convenção usada em `Member.situacao`.
 */
export interface EventAttendance extends BaseEntity {
  eventId: string;
  memberId: string;
  statusPresenca: EventAttendanceStatus;
  respondidoEm: Date | null;
}
