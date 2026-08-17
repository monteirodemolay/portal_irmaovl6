import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IPersonalEventRepository } from '../repositories/personal-event.repository';

export interface DeletePersonalEventDeps {
  personalEventRepository: IPersonalEventRepository;
  clock: IClock;
}

/** Sem `requirePermission`: ownership por `ctx.uid` — mesmo raciocínio de `UpdatePersonalEventUseCase`. */
export class DeletePersonalEventUseCase {
  constructor(private readonly deps: DeletePersonalEventDeps) {}

  async execute(ctx: AuthContext, eventId: string): Promise<Result<void>> {
    const current = await this.deps.personalEventRepository.findById(eventId);
    if (!current || current.tenantId !== ctx.tenantId || current.userId !== ctx.uid) {
      return err(new NotFoundError('PersonalEvent', eventId));
    }

    const now = this.deps.clock.now();
    await this.deps.personalEventRepository.update({
      ...current,
      deletedAt: now,
      status: 'archived',
      ativo: false,
      updatedAt: now,
      updatedBy: ctx.uid,
    });

    return ok(undefined);
  }
}
