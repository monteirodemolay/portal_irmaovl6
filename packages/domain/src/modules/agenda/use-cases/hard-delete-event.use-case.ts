import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IEventRepository } from '../repositories/event.repository';

export interface HardDeleteEventDeps {
  eventRepository: IEventRepository;
}

/** Exclusão física, irreversível — usada pra apagar registros de vez (ex.: cadastro por engano). */
export class HardDeleteEventUseCase {
  constructor(private readonly deps: HardDeleteEventDeps) {}

  async execute(ctx: AuthContext, eventId: string): Promise<Result<void>> {
    requirePermission(ctx, 'event:delete');

    const current = await this.deps.eventRepository.findById(eventId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Event', eventId));
    }

    await this.deps.eventRepository.hardDelete(eventId);
    return ok(undefined);
  }
}
