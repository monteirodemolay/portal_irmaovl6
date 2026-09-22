import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveItemRepository,
  InMemoryBoardTermRepository,
  InMemoryEventRepository,
} from '../../../test/fakes';
import type { Event } from '../../agenda/entities/event.entity';
import type { BoardTerm } from '../../governance/entities/board-term.entity';
import type { ArchiveItem } from '../entities/archive-item.entity';
import { BackfillArchiveBoardTermLinksUseCase } from './backfill-archive-board-term-links.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['boardTerm:manage'],
};

const term: BoardTerm = {
  id: 'term-2026',
  tenantId: 't1',
  nome: '2026/2027',
  periodoInicio: new Date('2026-06-01'),
  periodoFim: new Date('2027-05-31'),
  createdAt: new Date('2026-06-01'),
  updatedAt: new Date('2026-06-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

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
    origemIniciacaoMemberIds: ['m1', 'm2'],
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

function buildUseCase() {
  const eventRepository = new InMemoryEventRepository();
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const useCase = new BackfillArchiveBoardTermLinksUseCase({
    eventRepository,
    archiveItemRepository,
    boardTermRepository,
    clock: new FixedClock(new Date('2026-09-01T00:00:00Z')),
  });
  return { useCase, eventRepository, archiveItemRepository, boardTermRepository };
}

describe('BackfillArchiveBoardTermLinksUseCase', () => {
  it('preenche boardTermId do Evento e do ArchiveItem quando a Gestão já existe', async () => {
    const { useCase, eventRepository, archiveItemRepository, boardTermRepository } = buildUseCase();
    await boardTermRepository.create(term);
    await eventRepository.create(buildEvent());
    await archiveItemRepository.create(buildArchiveItem());

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      eventosCorrigidos: 1,
      itensCorrigidos: 1,
    });

    const event = await eventRepository.findById('event-1');
    expect(event?.boardTermId).toBe('term-2026');
    const item = await archiveItemRepository.findById('item-1');
    expect(item?.boardTermId).toBe('term-2026');
  });

  it('não mexe em quem já tem boardTermId preenchido', async () => {
    const { useCase, eventRepository, archiveItemRepository, boardTermRepository } = buildUseCase();
    await boardTermRepository.create(term);
    await eventRepository.create(buildEvent({ boardTermId: 'outro-term' }));
    await archiveItemRepository.create(buildArchiveItem({ boardTermId: 'outro-term' }));

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.eventosCorrigidos).toBe(0);
    expect(result.value.itensCorrigidos).toBe(0);

    const event = await eventRepository.findById('event-1');
    expect(event?.boardTermId).toBe('outro-term');
  });

  it('deixa boardTermId em null quando ainda não existe Gestão pra data', async () => {
    const { useCase, eventRepository, archiveItemRepository } = buildUseCase();
    await eventRepository.create(buildEvent());
    await archiveItemRepository.create(buildArchiveItem());

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.eventosCorrigidos).toBe(0);
    expect(result.value.itensCorrigidos).toBe(0);

    const event = await eventRepository.findById('event-1');
    expect(event?.boardTermId).toBeNull();
  });

  it('lança ForbiddenError sem a permissão boardTerm:manage', async () => {
    const { useCase } = buildUseCase();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao)).rejects.toThrow(ForbiddenError);
  });
});
