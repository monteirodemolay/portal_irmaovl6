import type { AuthContext } from '../../../shared/auth-context';
import type { PersonalEvent } from '../entities/personal-event.entity';
import type { IPersonalEventRepository } from '../repositories/personal-event.repository';

export interface ListMyPersonalEventsDeps {
  personalEventRepository: IPersonalEventRepository;
}

export interface ListMyPersonalEventsInput {
  from: Date;
  to: Date;
}

export class ListMyPersonalEventsUseCase {
  constructor(private readonly deps: ListMyPersonalEventsDeps) {}

  async execute(ctx: AuthContext, input: ListMyPersonalEventsInput): Promise<PersonalEvent[]> {
    return this.deps.personalEventRepository.listByUserInRange(
      ctx.tenantId,
      ctx.uid,
      input.from,
      input.to,
    );
  }
}
