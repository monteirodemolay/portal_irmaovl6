import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { Event } from '../entities/event.entity';
import type { IEventRepository } from '../repositories/event.repository';

export interface DeleteEventDeps {
  eventRepository: IEventRepository;
  clock: IClock;
}

/** Exclusão lógica — seta `deletedAt`, nunca remove o documento (docs/architecture/03 §3.1). */
export class DeleteEventUseCase {
  constructor(private readonly deps: DeleteEventDeps) {}

  async execute(ctx: AuthContext, eventId: string): Promise<Result<Event>> {
    requirePermission(ctx, 'event:delete');

    const current = await this.deps.eventRepository.findById(eventId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Event', eventId));
    }

    const now = this.deps.clock.now();
    const updated: Event = {
      ...current,
      deletedAt: now,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.eventRepository.update(updated);

    return ok(updated);
  }
}
