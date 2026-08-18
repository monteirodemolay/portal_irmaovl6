import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryPersonalNoteRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreatePersonalNoteUseCase } from './create-personal-note.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildUseCase() {
  const personalNoteRepository = new InMemoryPersonalNoteRepository();
  const useCase = new CreatePersonalNoteUseCase({
    personalNoteRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, personalNoteRepository };
}

describe('CreatePersonalNoteUseCase', () => {
  it('cria uma anotação avulsa, não fixada, sem evento vinculado', async () => {
    const { useCase, personalNoteRepository } = buildUseCase();

    const result = await useCase.execute(ctx, {
      texto: 'Levar ritual em papel.',
      eventoOrigem: null,
      eventoId: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fixada).toBe(false);
    expect(result.value.userId).toBe('u1');
    const stored = await personalNoteRepository.findById(result.value.id);
    expect(stored?.texto).toBe('Levar ritual em papel.');
  });
});
