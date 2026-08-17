import type { PersonalEventFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, ok, err, type Result } from '../../../shared/result';
import type { PersonalEvent } from '../entities/personal-event.entity';
import type { IPersonalEventRepository } from '../repositories/personal-event.repository';

export interface CreatePersonalEventDeps {
  personalEventRepository: IPersonalEventRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/** Sem `requirePermission`: compromisso pessoal é uma ação pessoal, não gated por RBAC de recurso. */
export class CreatePersonalEventUseCase {
  constructor(private readonly deps: CreatePersonalEventDeps) {}

  async execute(ctx: AuthContext, input: PersonalEventFormValues): Promise<Result<PersonalEvent>> {
    if (input.dataFim <= input.dataInicio) {
      return err(new ConflictError('A data final deve ser posterior à data inicial.'));
    }

    const now = this.deps.clock.now();
    const event: PersonalEvent = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      userId: ctx.uid,
      ...input,
      googleEventId: null,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.personalEventRepository.create(event);

    return ok(event);
  }
}
