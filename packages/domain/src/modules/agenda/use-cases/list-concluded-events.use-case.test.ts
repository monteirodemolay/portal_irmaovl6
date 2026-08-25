import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryEventRepository } from '../../../test/fakes';
import type { Event } from '../entities/event.entity';
import { ListConcludedEventsUseCase } from './list-concluded-events.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['event:read'],
};

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'evento-1',
    tenantId: 't1',
    tipo: 'sessao',
    titulo: 'Sessão',
    descricao: null,
    local: 'Templo',
    dataInicio: new Date('2026-06-01T20:00:00'),
    dataFim: null,
    exigeConfirmacaoPresenca: false,
    capacidadeMaxima: null,
    traje: null,
    chegadaSugerida: null,
    observacoes: null,
    arquivosRelacionados: [],
    boardTermId: null,
    nivelAcesso: 'irmaos',
    exibirNaLinhaDoTempo: true,
    grau: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('ListConcludedEventsUseCase', () => {
  it('inclui eventos passados e excluídos, mas não os futuros', async () => {
    const eventRepository = new InMemoryEventRepository();
    await eventRepository.create(
      buildEvent({ id: 'passado', dataInicio: new Date('2026-01-01T20:00:00') }),
    );
    await eventRepository.create(buildEvent({ id: 'excluido', deletedAt: new Date('2026-01-20') }));
    await eventRepository.create(buildEvent({ id: 'futuro' }));
    const useCase = new ListConcludedEventsUseCase({
      eventRepository,
      clock: new FixedClock(new Date('2026-03-01')),
    });

    const result = await useCase.execute(ctx, { limit: 20 });

    expect(result.items.map((e) => e.id).sort()).toEqual(['excluido', 'passado']);
  });
});
