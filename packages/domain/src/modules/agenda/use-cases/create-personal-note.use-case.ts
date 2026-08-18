import type { PersonalNoteFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { PersonalNote } from '../entities/personal-note.entity';
import type { IPersonalNoteRepository } from '../repositories/personal-note.repository';

export interface CreatePersonalNoteDeps {
  personalNoteRepository: IPersonalNoteRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/** Sem `requirePermission`: anotação pessoal é uma ação pessoal, não gated por RBAC de recurso. */
export class CreatePersonalNoteUseCase {
  constructor(private readonly deps: CreatePersonalNoteDeps) {}

  async execute(ctx: AuthContext, input: PersonalNoteFormValues): Promise<Result<PersonalNote>> {
    const now = this.deps.clock.now();
    const note: PersonalNote = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      userId: ctx.uid,
      texto: input.texto,
      eventoOrigem: input.eventoOrigem,
      eventoId: input.eventoId,
      fixada: false,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.personalNoteRepository.create(note);

    return ok(note);
  }
}
