import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryPersonalNoteRepository } from '../../../test/fakes';
import type { PersonalNote } from '../entities/personal-note.entity';
import { ListMyPersonalNotesUseCase } from './list-my-personal-notes.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildNote(overrides: Partial<PersonalNote> = {}): PersonalNote {
  return {
    id: 'pn-1',
    tenantId: 't1',
    userId: 'u1',
    texto: 'Nota',
    fixada: false,
    eventoOrigem: null,
    eventoId: null,
    createdAt: new Date('2026-08-01'),
    updatedAt: new Date('2026-08-01'),
    createdBy: 'u1',
    updatedBy: 'u1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('ListMyPersonalNotesUseCase', () => {
  it('lista só as anotações do usuário, fixadas primeiro', async () => {
    const personalNoteRepository = new InMemoryPersonalNoteRepository();
    const useCase = new ListMyPersonalNotesUseCase({ personalNoteRepository });

    await personalNoteRepository.create(
      buildNote({ id: 'pn-1', fixada: false, createdAt: new Date('2026-08-03') }),
    );
    await personalNoteRepository.create(
      buildNote({ id: 'pn-2', fixada: true, createdAt: new Date('2026-08-01') }),
    );
    await personalNoteRepository.create(buildNote({ id: 'pn-3', userId: 'u2' }));

    const result = await useCase.execute(ctx);

    expect(result.map((n) => n.id)).toEqual(['pn-2', 'pn-1']);
  });
});
