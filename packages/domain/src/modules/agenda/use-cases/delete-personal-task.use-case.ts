import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IPersonalTaskRepository } from '../repositories/personal-task.repository';

export interface DeletePersonalTaskDeps {
  personalTaskRepository: IPersonalTaskRepository;
  clock: IClock;
}

/** Sem `requirePermission`: ownership por `ctx.uid` — mesmo raciocínio de `DeletePersonalEventUseCase`. */
export class DeletePersonalTaskUseCase {
  constructor(private readonly deps: DeletePersonalTaskDeps) {}

  async execute(ctx: AuthContext, taskId: string): Promise<Result<void>> {
    const current = await this.deps.personalTaskRepository.findById(taskId);
    if (!current || current.tenantId !== ctx.tenantId || current.userId !== ctx.uid) {
      return err(new NotFoundError('PersonalTask', taskId));
    }

    const now = this.deps.clock.now();
    await this.deps.personalTaskRepository.update({
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
