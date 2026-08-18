import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryPersonalNoteRepository } from '../../../test/fakes';
import type { PersonalNote } from '../entities/personal-note.entity';
import { DeletePersonalNoteUseCase } from './delete-personal-note.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };
const otherUserCtx: AuthContext = { uid: 'u2', tenantId: 't1', roleId: 'r1', permissions: [] };

const baseNote: PersonalNote = {
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
};

function buildUseCase() {
  const personalNoteRepository = new InMemoryPersonalNoteRepository();
  const useCase = new DeletePersonalNoteUseCase({
    personalNoteRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
  });
  return { useCase, personalNoteRepository };
}

describe('DeletePersonalNoteUseCase', () => {
  it('faz soft delete da anotação do próprio dono', async () => {
    const { useCase, personalNoteRepository } = buildUseCase();
    await personalNoteRepository.create(baseNote);

    const result = await useCase.execute(ctx, 'pn-1');

    expect(result.ok).toBe(true);
    const stored = await personalNoteRepository.findById('pn-1');
    expect(stored?.deletedAt).toEqual(new Date('2026-08-10T00:00:00Z'));
  });

  it('retorna NotFoundError quando a anotação é de outro usuário', async () => {
    const { useCase, personalNoteRepository } = buildUseCase();
    await personalNoteRepository.create(baseNote);

    const result = await useCase.execute(otherUserCtx, 'pn-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
