import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { PersonalTask } from '../entities/personal-task.entity';
import type { IPersonalTaskRepository } from '../repositories/personal-task.repository';

export interface TogglePersonalTaskDeps {
  personalTaskRepository: IPersonalTaskRepository;
  clock: IClock;
}

/** Sem `requirePermission`: ownership por `ctx.uid` — mesmo raciocínio de `UpdatePersonalEventUseCase`. */
export class TogglePersonalTaskUseCase {
  constructor(private readonly deps: TogglePersonalTaskDeps) {}

  async execute(ctx: AuthContext, taskId: string): Promise<Result<PersonalTask>> {
    const current = await this.deps.personalTaskRepository.findById(taskId);
    if (!current || current.tenantId !== ctx.tenantId || current.userId !== ctx.uid) {
      return err(new NotFoundError('PersonalTask', taskId));
    }

    const updated: PersonalTask = {
      ...current,
      concluida: !current.concluida,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.personalTaskRepository.update(updated);

    return ok(updated);
  }
}
