import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryPersonalNoteRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { UpsertPersonalEventNoteUseCase } from './upsert-personal-event-note.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildUseCase() {
  const personalNoteRepository = new InMemoryPersonalNoteRepository();
  const useCase = new UpsertPersonalEventNoteUseCase({
    personalNoteRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, personalNoteRepository };
}

describe('UpsertPersonalEventNoteUseCase', () => {
  it('cria a anotação na primeira chamada para o evento', async () => {
    const { useCase, personalNoteRepository } = buildUseCase();

    const result = await useCase.execute(ctx, {
      eventoOrigem: 'vl6',
      eventoId: 'event-1',
      texto: 'Levar caderno',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.eventoOrigem).toBe('vl6');
    expect(result.value.eventoId).toBe('event-1');

    const stored = await personalNoteRepository.findByEvent('t1', 'u1', 'vl6', 'event-1');
    expect(stored?.texto).toBe('Levar caderno');
  });

  it('atualiza a mesma anotação em chamadas seguintes, sem duplicar', async () => {
    const { useCase, personalNoteRepository } = buildUseCase();
    await useCase.execute(ctx, {
      eventoOrigem: 'vl6',
      eventoId: 'event-1',
      texto: 'Primeira versão',
    });

    const result = await useCase.execute(ctx, {
      eventoOrigem: 'vl6',
      eventoId: 'event-1',
      texto: 'Segunda versão',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.texto).toBe('Segunda versão');

    const notes = await personalNoteRepository.listByUser('t1', 'u1');
    expect(notes).toHaveLength(1);
  });
});
