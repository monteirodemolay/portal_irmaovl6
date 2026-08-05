import type { EventAttendanceStatus } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { EventAttendance } from '../entities/event-attendance.entity';
import type { IEventAttendanceRepository } from '../repositories/event-attendance.repository';
import type { IEventRepository } from '../repositories/event.repository';

export type AttendanceResponse = Extract<EventAttendanceStatus, 'confirmado' | 'recusado'>;

export interface ConfirmAttendanceDeps {
  eventRepository: IEventRepository;
  attendanceRepository: IEventAttendanceRepository;
  memberRepository: IMemberRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Confirmação/recusa de presença pelo próprio Irmão. Não usa `requirePermission`
 * além de `event:read` (ler o evento): é uma ação pessoal sobre a própria
 * presença, não gated por uma permissão de escrita de escopo amplo.
 *
 * Se `capacidadeMaxima` já foi atingida, uma tentativa de confirmação entra
 * como `pendente` (lista de espera) — docs/architecture/06 §6.4.
 */
export class ConfirmAttendanceUseCase {
  constructor(private readonly deps: ConfirmAttendanceDeps) {}

  async execute(
    ctx: AuthContext,
    eventId: string,
    resposta: AttendanceResponse,
  ): Promise<Result<EventAttendance>> {
    requirePermission(ctx, 'event:read');

    const event = await this.deps.eventRepository.findById(eventId);
    if (!event || event.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Event', eventId));
    }
    if (!event.exigeConfirmacaoPresenca) {
      return err(new ConflictError('Este evento não exige confirmação de presença.'));
    }

    const member = await this.deps.memberRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!member) {
      return err(new NotFoundError('Member', ctx.uid));
    }

    let statusPresenca: EventAttendanceStatus = resposta;
    if (resposta === 'confirmado' && event.capacidadeMaxima !== null) {
      const confirmados = await this.deps.attendanceRepository.countConfirmedByEvent(eventId);
      if (confirmados >= event.capacidadeMaxima) {
        statusPresenca = 'pendente';
      }
    }

    const now = this.deps.clock.now();
    const existing = await this.deps.attendanceRepository.findByEventAndMember(eventId, member.id);

    if (existing) {
      const updated: EventAttendance = {
        ...existing,
        statusPresenca,
        respondidoEm: now,
        updatedAt: now,
        updatedBy: ctx.uid,
      };
      await this.deps.attendanceRepository.update(updated);
      return ok(updated);
    }

    const attendance: EventAttendance = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      eventId,
      memberId: member.id,
      statusPresenca,
      respondidoEm: now,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.attendanceRepository.create(attendance);

    return ok(attendance);
  }
}
