import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { PersonalNote } from '../entities/personal-note.entity';
import type { IPersonalNoteRepository } from '../repositories/personal-note.repository';

export interface UpsertPersonalEventNoteInput {
  eventoOrigem: 'vl6' | 'personal' | 'google';
  eventoId: string;
  texto: string;
}

export interface UpsertPersonalEventNoteDeps {
  personalNoteRepository: IPersonalNoteRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Cria ou atualiza a anotação privada vinculada a um evento específico (de
 * qualquer origem) — usada pelo textarea de "Anotações privadas" no painel
 * de detalhes, salvo automaticamente. Sem `requirePermission`: ownership
 * por `ctx.uid`.
 */
export class UpsertPersonalEventNoteUseCase {
  constructor(private readonly deps: UpsertPersonalEventNoteDeps) {}

  async execute(
    ctx: AuthContext,
    input: UpsertPersonalEventNoteInput,
  ): Promise<Result<PersonalNote>> {
    const now = this.deps.clock.now();
    const existing = await this.deps.personalNoteRepository.findByEvent(
      ctx.tenantId,
      ctx.uid,
      input.eventoOrigem,
      input.eventoId,
    );

    if (existing) {
      const updated: PersonalNote = {
        ...existing,
        texto: input.texto,
        updatedAt: now,
        updatedBy: ctx.uid,
      };
      await this.deps.personalNoteRepository.update(updated);
      return ok(updated);
    }

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
