import type { PersonalEventFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ConflictError, NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { PersonalEvent } from '../entities/personal-event.entity';
import type { IPersonalEventRepository } from '../repositories/personal-event.repository';

export interface UpdatePersonalEventDeps {
  personalEventRepository: IPersonalEventRepository;
  clock: IClock;
}

/**
 * Sem `requirePermission`: ownership por `ctx.uid`. Um compromisso de outro
 * usuário (ou de outro tenant) devolve `NotFoundError`, nunca `ForbiddenError`
 * — não revela a existência do registro a quem não é o dono.
 */
export class UpdatePersonalEventUseCase {
  constructor(private readonly deps: UpdatePersonalEventDeps) {}

  async execute(
    ctx: AuthContext,
    eventId: string,
    input: PersonalEventFormValues,
  ): Promise<Result<PersonalEvent>> {
    const current = await this.deps.personalEventRepository.findById(eventId);
    if (!current || current.tenantId !== ctx.tenantId || current.userId !== ctx.uid) {
      return err(new NotFoundError('PersonalEvent', eventId));
    }

    if (input.dataFim <= input.dataInicio) {
      return err(new ConflictError('A data final deve ser posterior à data inicial.'));
    }

    const updated: PersonalEvent = {
      ...current,
      ...input,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.personalEventRepository.update(updated);

    return ok(updated);
  }
}
