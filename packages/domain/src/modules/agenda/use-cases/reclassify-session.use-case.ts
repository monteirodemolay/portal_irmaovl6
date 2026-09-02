import type { SessionAccessKind, SessionType, SessionWorkDegree } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ValidationError, ok, err, type Result } from '../../../shared/result';
import type { Event } from '../entities/event.entity';
import type { IEventRepository } from '../repositories/event.repository';

export interface ReclassifySessionDeps {
  eventRepository: IEventRepository;
  clock: IClock;
}

export interface ReclassifySessionInput {
  sessionType: SessionType;
  sessionNature: string;
  degreeWork: SessionWorkDegree | null;
  access: SessionAccessKind | null;
}

/**
 * Correção pontual da classificação de uma Sessão pendente de revisão
 * (`classificationReviewRequired`) — ação dedicada e leve do painel de
 * revisão em lote, sem passar pela edição completa do Evento
 * (`UpdateEventUseCase`, que exige o `EventFormValues` inteiro). Nunca
 * mexe em `titulo`/`legacySessionType` (Regra de Preservação — ver
 * `SeedSessionClassificationUseCase`); sempre limpa
 * `classificationReviewRequired` ao confirmar.
 */
export class ReclassifySessionUseCase {
  constructor(private readonly deps: ReclassifySessionDeps) {}

  async execute(
    ctx: AuthContext,
    eventId: string,
    input: ReclassifySessionInput,
  ): Promise<Result<Event>> {
    requirePermission(ctx, 'event:manage');

    const current = await this.deps.eventRepository.findById(eventId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Event', eventId));
    }
    if (current.tipo !== 'sessao') {
      return err(new ValidationError('Este Evento não é uma Sessão.'));
    }

    const updated: Event = {
      ...current,
      sessionType: input.sessionType,
      sessionNature: input.sessionNature,
      degreeWork: input.degreeWork,
      access: input.access,
      classificationReviewRequired: false,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.eventRepository.update(updated);

    return ok(updated);
  }
}
