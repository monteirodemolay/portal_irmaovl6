import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryEventAttendanceRepository } from '../../../test/fakes';
import type { EventAttendance } from '../entities/event-attendance.entity';
import { ListEventAttendeesUseCase } from './list-event-attendees.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['event:read'],
};

function buildAttendance(overrides: Partial<EventAttendance> = {}): EventAttendance {
  return {
    id: 'attendance-1',
    tenantId: 't1',
    eventId: 'event-1',
    memberId: 'member-1',
    statusPresenca: 'confirmado',
    respondidoEm: new Date('2026-01-15'),
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-01-15'),
    createdBy: 'member-1',
    updatedBy: 'member-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('ListEventAttendeesUseCase', () => {
  it('exige a permissão event:read', async () => {
    const repo = new InMemoryEventAttendanceRepository();
    const useCase = new ListEventAttendeesUseCase({ attendanceRepository: repo });
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, 'event-1')).rejects.toThrow(ForbiddenError);
  });

  it('lista apenas as confirmações do evento informado', async () => {
    const repo = new InMemoryEventAttendanceRepository();
    await repo.create(buildAttendance());
    await repo.create(
      buildAttendance({ id: 'attendance-2', eventId: 'event-2', memberId: 'member-2' }),
    );
    const useCase = new ListEventAttendeesUseCase({ attendanceRepository: repo });

    const result = await useCase.execute(ctx, 'event-1');

    expect(result).toHaveLength(1);
    expect(result[0]?.memberId).toBe('member-1');
  });

  it('retorna lista vazia quando o evento não tem confirmações', async () => {
    const repo = new InMemoryEventAttendanceRepository();
    const useCase = new ListEventAttendeesUseCase({ attendanceRepository: repo });

    const result = await useCase.execute(ctx, 'event-sem-confirmacoes');

    expect(result).toEqual([]);
  });
});
