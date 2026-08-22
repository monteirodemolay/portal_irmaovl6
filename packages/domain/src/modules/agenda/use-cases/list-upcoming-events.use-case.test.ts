import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryEventRepository } from '../../../test/fakes';
import type { Event } from '../entities/event.entity';
import { ListAllEventsUseCase, ListUpcomingEventsUseCase } from './list-upcoming-events.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: ['event:read'] };

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    tenantId: 't1',
    tipo: 'sessao',
    titulo: 'Sessão Ordinária',
    descricao: null,
    local: 'Sede da Loja',
    dataInicio: new Date('2026-07-01T20:00:00Z'),
    dataFim: new Date('2026-07-01T22:00:00Z'),
    exigeConfirmacaoPresenca: false,
    capacidadeMaxima: null,
    traje: null,
    chegadaSugerida: null,
    observacoes: null,
    arquivosRelacionados: [],
    boardTermId: null,
    nivelAcesso: 'irmaos',
    exibirNaLinhaDoTempo: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin',
    updatedBy: 'admin',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('ListUpcomingEventsUseCase', () => {
  it('exige a permissão event:read', async () => {
    const repo = new InMemoryEventRepository();
    const useCase = new ListUpcomingEventsUseCase({
      eventRepository: repo,
      clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    });
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, { limit: 20 })).rejects.toThrow(ForbiddenError);
  });

  it('filtra eventos passados, retornando apenas os futuros', async () => {
    const repo = new InMemoryEventRepository();
    await repo.create(buildEvent({ id: 'passado', dataInicio: new Date('2026-01-01T00:00:00Z') }));
    await repo.create(buildEvent({ id: 'futuro', dataInicio: new Date('2026-07-01T00:00:00Z') }));
    const useCase = new ListUpcomingEventsUseCase({
      eventRepository: repo,
      clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    });

    const result = await useCase.execute(ctx, { limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe('futuro');
  });

  it('retorna lista vazia quando não há eventos futuros', async () => {
    const repo = new InMemoryEventRepository();
    await repo.create(buildEvent({ id: 'passado', dataInicio: new Date('2026-01-01T00:00:00Z') }));
    const useCase = new ListUpcomingEventsUseCase({
      eventRepository: repo,
      clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    });

    const result = await useCase.execute(ctx, { limit: 20 });

    expect(result.items).toEqual([]);
  });
});

describe('ListAllEventsUseCase', () => {
  it('exige a permissão event:read', async () => {
    const repo = new InMemoryEventRepository();
    const useCase = new ListAllEventsUseCase({ eventRepository: repo });
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, { limit: 20 })).rejects.toThrow(ForbiddenError);
  });

  it('inclui eventos passados na listagem administrativa', async () => {
    const repo = new InMemoryEventRepository();
    await repo.create(buildEvent({ id: 'passado', dataInicio: new Date('2026-01-01T00:00:00Z') }));
    await repo.create(buildEvent({ id: 'futuro', dataInicio: new Date('2026-07-01T00:00:00Z') }));
    const useCase = new ListAllEventsUseCase({ eventRepository: repo });

    const result = await useCase.execute(ctx, { limit: 20 });

    expect(result.items.map((e) => e.id).sort()).toEqual(['futuro', 'passado']);
  });
});
