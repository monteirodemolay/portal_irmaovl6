import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryEventRepository } from '../../../test/fakes';
import type { Event } from '../entities/event.entity';
import { DeleteEventUseCase } from './delete-event.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['event:manage'],
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

describe('DeleteEventUseCase', () => {
  it('marca deletedAt sem apagar o documento', async () => {
    const eventRepository = new InMemoryEventRepository();
    await eventRepository.create(buildEvent());
    const useCase = new DeleteEventUseCase({
      eventRepository,
      clock: new FixedClock(new Date('2026-03-01')),
    });

    const result = await useCase.execute(ctx, 'evento-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.deletedAt).toEqual(new Date('2026-03-01'));
    expect(await eventRepository.findById('evento-1')).not.toBeNull();
  });

  it('retorna NotFoundError quando o evento não existe no tenant', async () => {
    const eventRepository = new InMemoryEventRepository();
    const useCase = new DeleteEventUseCase({ eventRepository, clock: new FixedClock() });

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
