import type { PersonalTaskFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { PersonalTask } from '../entities/personal-task.entity';
import type { IPersonalTaskRepository } from '../repositories/personal-task.repository';

export interface CreatePersonalTaskDeps {
  personalTaskRepository: IPersonalTaskRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/** Sem `requirePermission`: tarefa pessoal é uma ação pessoal, não gated por RBAC de recurso. */
export class CreatePersonalTaskUseCase {
  constructor(private readonly deps: CreatePersonalTaskDeps) {}

  async execute(ctx: AuthContext, input: PersonalTaskFormValues): Promise<Result<PersonalTask>> {
    const now = this.deps.clock.now();
    const task: PersonalTask = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      userId: ctx.uid,
      titulo: input.titulo,
      concluida: false,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.personalTaskRepository.create(task);

    return ok(task);
  }
}
