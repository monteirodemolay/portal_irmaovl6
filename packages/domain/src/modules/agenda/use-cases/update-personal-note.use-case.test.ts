import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryPersonalNoteRepository } from '../../../test/fakes';
import type { PersonalNote } from '../entities/personal-note.entity';
import { UpdatePersonalNoteUseCase } from './update-personal-note.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };
const otherUserCtx: AuthContext = { uid: 'u2', tenantId: 't1', roleId: 'r1', permissions: [] };

const baseNote: PersonalNote = {
  id: 'pn-1',
  tenantId: 't1',
  userId: 'u1',
  texto: 'Texto original',
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
  const useCase = new UpdatePersonalNoteUseCase({
    personalNoteRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
  });
  return { useCase, personalNoteRepository };
}

describe('UpdatePersonalNoteUseCase', () => {
  it('atualiza o texto mantendo fixada', async () => {
    const { useCase, personalNoteRepository } = buildUseCase();
    await personalNoteRepository.create(baseNote);

    const result = await useCase.execute(ctx, 'pn-1', { texto: 'Texto editado' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.texto).toBe('Texto editado');
    expect(result.value.fixada).toBe(false);
  });

  it('fixa a anotação sem alterar o texto', async () => {
    const { useCase, personalNoteRepository } = buildUseCase();
    await personalNoteRepository.create(baseNote);

    const result = await useCase.execute(ctx, 'pn-1', { fixada: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fixada).toBe(true);
    expect(result.value.texto).toBe('Texto original');
  });

  it('retorna NotFoundError quando a anotação é de outro usuário', async () => {
    const { useCase, personalNoteRepository } = buildUseCase();
    await personalNoteRepository.create(baseNote);

    const result = await useCase.execute(otherUserCtx, 'pn-1', { texto: 'Invasão' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
