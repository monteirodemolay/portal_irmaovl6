import { describe, expect, it } from 'vitest';
import { FixedClock, InMemoryArchiveItemRepository, InMemoryEventRepository } from '../../../test/fakes';
import type { Event } from '../../agenda/entities/event.entity';
import type { ArchiveItem } from '../entities/archive-item.entity';
import { relinkOrphanArchiveItems } from './relink-orphan-archive-items';

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    tenantId: 't1',
    tipo: 'sessao',
    titulo: 'Sessão de Iniciação — 29/08/2026',
    descricao: null,
    local: 'Sede da Loja',
    dataInicio: new Date('2026-08-29T20:00:00Z'),
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
    createdAt: new Date('2026-08-29'),
    updatedAt: new Date('2026-08-29'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildArchiveItem(overrides: Partial<ArchiveItem> = {}): ArchiveItem {
  return {
    id: 'item-1',
    tenantId: 't1',
    eventId: 'event-1',
    boardTermId: null,
    titulo: 'Iniciação — 29/08/2026',
    tipo: 'outro',
    descricao: null,
    publicacaoStatus: 'rascunho',
    nivelAcesso: 'irmaos',
    capaMediaId: null,
    createdAt: new Date('2026-08-29'),
    updatedAt: new Date('2026-08-29'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'draft',
    ativo: true,
    ...overrides,
  };
}

const term = { id: 'term-2026', periodoInicio: new Date('2026-06-01'), periodoFim: new Date('2027-05-31') };

describe('relinkOrphanArchiveItems', () => {
  it('vincula Evento e ArchiveItem órfãos dentro do período', async () => {
    const eventRepository = new InMemoryEventRepository();
    const archiveItemRepository = new InMemoryArchiveItemRepository();
    await eventRepository.create(buildEvent());
    await archiveItemRepository.create(buildArchiveItem());

    const result = await relinkOrphanArchiveItems(
      { eventRepository, archiveItemRepository, clock: new FixedClock(new Date('2026-09-01')) },
      't1',
      'admin-1',
      term,
    );

    expect(result).toEqual({ eventosCorrigidos: 1, itensCorrigidos: 1 });
    expect((await eventRepository.findById('event-1'))?.boardTermId).toBe('term-2026');
    expect((await archiveItemRepository.findById('item-1'))?.boardTermId).toBe('term-2026');
  });

  it('nunca sobrescreve um boardTermId já preenchido', async () => {
    const eventRepository = new InMemoryEventRepository();
    const archiveItemRepository = new InMemoryArchiveItemRepository();
    await eventRepository.create(buildEvent({ boardTermId: 'outro-term' }));
    await archiveItemRepository.create(buildArchiveItem({ boardTermId: 'outro-term' }));

    const result = await relinkOrphanArchiveItems(
      { eventRepository, archiveItemRepository, clock: new FixedClock(new Date('2026-09-01')) },
      't1',
      'admin-1',
      term,
    );

    expect(result).toEqual({ eventosCorrigidos: 0, itensCorrigidos: 0 });
    expect((await eventRepository.findById('event-1'))?.boardTermId).toBe('outro-term');
  });

  it('ignora Eventos fora do período', async () => {
    const eventRepository = new InMemoryEventRepository();
    const archiveItemRepository = new InMemoryArchiveItemRepository();
    await eventRepository.create(buildEvent({ dataInicio: new Date('2020-01-01T12:00:00Z') }));

    const result = await relinkOrphanArchiveItems(
      { eventRepository, archiveItemRepository, clock: new FixedClock(new Date('2026-09-01')) },
      't1',
      'admin-1',
      term,
    );

    expect(result.eventosCorrigidos).toBe(0);
  });
});
