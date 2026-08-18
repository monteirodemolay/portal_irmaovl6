import type { AuthContext } from '../../../shared/auth-context';
import type { PersonalNote } from '../entities/personal-note.entity';
import type { IPersonalNoteRepository } from '../repositories/personal-note.repository';

export interface ListMyPersonalNotesDeps {
  personalNoteRepository: IPersonalNoteRepository;
}

/** Fixadas primeiro, mais recentes primeiro dentro de cada grupo — ordenação em memória (a consulta ao Firestore é só de igualdade). */
export class ListMyPersonalNotesUseCase {
  constructor(private readonly deps: ListMyPersonalNotesDeps) {}

  async execute(ctx: AuthContext): Promise<PersonalNote[]> {
    const notes = await this.deps.personalNoteRepository.listByUser(ctx.tenantId, ctx.uid);
    return notes.sort((a, b) => {
      if (a.fixada !== b.fixada) return a.fixada ? -1 : 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }
}
