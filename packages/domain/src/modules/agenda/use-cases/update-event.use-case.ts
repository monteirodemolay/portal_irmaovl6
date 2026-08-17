import type { EventFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Event } from '../entities/event.entity';
import type { IEventRepository } from '../repositories/event.repository';

export interface UpdateEventDeps {
  eventRepository: IEventRepository;
  clock: IClock;
}

/** Edição administrativa completa do evento — requer `event:update`. */
export class UpdateEventUseCase {
  constructor(private readonly deps: UpdateEventDeps) {}

  async execute(ctx: AuthContext, eventId: string, input: EventFormValues): Promise<Result<Event>> {
    requirePermission(ctx, 'event:update');

    const current = await this.deps.eventRepository.findById(eventId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Event', eventId));
    }

    if (input.dataFim && input.dataFim <= input.dataInicio) {
      return err(new ConflictError('A data final deve ser posterior à data inicial.'));
    }

    const updated: Event = {
      ...current,
      ...input,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.eventRepository.update(updated);

    return ok(updated);
  }
}
