import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { PersonalNote } from '../entities/personal-note.entity';
import type { IPersonalNoteRepository } from '../repositories/personal-note.repository';

export interface UpdatePersonalNoteInput {
  texto?: string;
  fixada?: boolean;
}

export interface UpdatePersonalNoteDeps {
  personalNoteRepository: IPersonalNoteRepository;
  clock: IClock;
}

/** Sem `requirePermission`: ownership por `ctx.uid`. Usado tanto para editar o texto quanto para fixar/desafixar. */
export class UpdatePersonalNoteUseCase {
  constructor(private readonly deps: UpdatePersonalNoteDeps) {}

  async execute(
    ctx: AuthContext,
    noteId: string,
    input: UpdatePersonalNoteInput,
  ): Promise<Result<PersonalNote>> {
    const current = await this.deps.personalNoteRepository.findById(noteId);
    if (!current || current.tenantId !== ctx.tenantId || current.userId !== ctx.uid) {
      return err(new NotFoundError('PersonalNote', noteId));
    }

    const updated: PersonalNote = {
      ...current,
      texto: input.texto ?? current.texto,
      fixada: input.fixada ?? current.fixada,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.personalNoteRepository.update(updated);

    return ok(updated);
  }
}
