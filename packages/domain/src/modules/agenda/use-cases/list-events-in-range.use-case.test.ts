import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryEventRepository } from '../../../test/fakes';
import type { Event } from '../entities/event.entity';
import { ListEventsInRangeUseCase } from './list-events-in-range.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: ['event:read'] };
const noPermCtx: AuthContext = { uid: 'u2', tenantId: 't1', roleId: 'r2', permissions: [] };

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'e1',
    tenantId: 't1',
    tipo: 'sessao',
    titulo: 'Sessão Ordinária',
    descricao: null,
    local: 'Sede da Loja',
    dataInicio: new Date('2026-08-15T20:00:00Z'),
    dataFim: new Date('2026-08-15T22:00:00Z'),
    exigeConfirmacaoPresenca: false,
    capacidadeMaxima: null,
    traje: null,
    chegadaSugerida: null,
    observacoes: null,
    arquivosRelacionados: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('ListEventsInRangeUseCase', () => {
  it('lista eventos do tenant dentro do intervalo', async () => {
    const eventRepository = new InMemoryEventRepository();
    await eventRepository.create(buildEvent());
    await eventRepository.create(buildEvent({ id: 'e2', dataInicio: new Date('2026-09-15') }));
    const useCase = new ListEventsInRangeUseCase({ eventRepository });

    const result = await useCase.execute(ctx, {
      from: new Date('2026-08-01'),
      to: new Date('2026-08-31'),
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('e1');
  });

  it('lança ForbiddenError sem event:read', async () => {
    const eventRepository = new InMemoryEventRepository();
    const useCase = new ListEventsInRangeUseCase({ eventRepository });

    await expect(
      useCase.execute(noPermCtx, { from: new Date('2026-08-01'), to: new Date('2026-08-31') }),
    ).rejects.toThrow(ForbiddenError);
  });
});
