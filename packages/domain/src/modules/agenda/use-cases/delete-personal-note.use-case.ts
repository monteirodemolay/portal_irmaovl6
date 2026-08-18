import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IPersonalNoteRepository } from '../repositories/personal-note.repository';

export interface DeletePersonalNoteDeps {
  personalNoteRepository: IPersonalNoteRepository;
  clock: IClock;
}

/** Sem `requirePermission`: ownership por `ctx.uid`. */
export class DeletePersonalNoteUseCase {
  constructor(private readonly deps: DeletePersonalNoteDeps) {}

  async execute(ctx: AuthContext, noteId: string): Promise<Result<void>> {
    const current = await this.deps.personalNoteRepository.findById(noteId);
    if (!current || current.tenantId !== ctx.tenantId || current.userId !== ctx.uid) {
      return err(new NotFoundError('PersonalNote', noteId));
    }

    const now = this.deps.clock.now();
    await this.deps.personalNoteRepository.update({
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
