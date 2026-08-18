import type { AuthContext } from '../../../shared/auth-context';
import type { PersonalTask } from '../entities/personal-task.entity';
import type { IPersonalTaskRepository } from '../repositories/personal-task.repository';

export interface ListMyPersonalTasksDeps {
  personalTaskRepository: IPersonalTaskRepository;
}

/** Pendentes primeiro, mais recentes primeiro dentro de cada grupo — ordenação em memória (a consulta ao Firestore é só de igualdade). */
export class ListMyPersonalTasksUseCase {
  constructor(private readonly deps: ListMyPersonalTasksDeps) {}

  async execute(ctx: AuthContext): Promise<PersonalTask[]> {
    const tasks = await this.deps.personalTaskRepository.listByUser(ctx.tenantId, ctx.uid);
    return tasks.sort((a, b) => {
      if (a.concluida !== b.concluida) return a.concluida ? 1 : -1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }
}
