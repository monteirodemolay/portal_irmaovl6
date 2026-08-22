import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryEventRepository } from '../../../test/fakes';
import type { Event } from '../entities/event.entity';
import { HardDeleteEventUseCase } from './hard-delete-event.use-case';

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
    dataInicio: new Date('2026-01-01T20:00:00'),
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
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: new Date('2026-02-01'),
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('HardDeleteEventUseCase', () => {
  it('remove o documento de vez', async () => {
    const eventRepository = new InMemoryEventRepository();
    await eventRepository.create(buildEvent());
    const useCase = new HardDeleteEventUseCase({ eventRepository });

    const result = await useCase.execute(ctx, 'evento-1');

    expect(result.ok).toBe(true);
    expect(await eventRepository.findById('evento-1')).toBeNull();
  });
});
