import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveItemRepository,
  InMemoryBoardTermRepository,
  InMemoryEventRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Event } from '../../agenda/entities/event.entity';
import type { BoardTerm } from '../../governance/entities/board-term.entity';
import { CreateArchiveItemUseCase } from './create-archive-item.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveItem:create'],
};

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    tenantId: 't1',
    tipo: 'sessao',
    titulo: 'Sessão Ordinária',
    descricao: null,
    local: 'Sede da Loja',
    dataInicio: new Date('2025-06-15T20:00:00Z'),
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

const term: BoardTerm = {
  id: 'term-1',
  tenantId: 't1',
  nome: 'Gestão 2025/2026',
  periodoInicio: new Date('2025-01-01'),
  periodoFim: new Date('2025-12-31'),
  createdAt: new Date('2024-12-01'),
  updatedAt: new Date('2024-12-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

function buildUseCase() {
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const eventRepository = new InMemoryEventRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const useCase = new CreateArchiveItemUseCase({
    archiveItemRepository,
    eventRepository,
    boardTermRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, archiveItemRepository, eventRepository, boardTermRepository };
}

const baseInput = {
  eventId: 'event-1',
  boardTermId: null,
  titulo: 'Fotos da Sessão',
  tipo: 'fotografia' as const,
  descricao: null,
  nivelAcesso: 'irmaos' as const,
};

describe('CreateArchiveItemUseCase', () => {
  it('rejeita quando o evento não existe', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('rejeita quando o evento pertence a outro tenant', async () => {
    const { useCase, eventRepository } = buildUseCase();
    await eventRepository.create(buildEvent({ tenantId: 't2' }));

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('identifica automaticamente o boardTermId a partir da data do evento', async () => {
    const { useCase, eventRepository, boardTermRepository } = buildUseCase();
    await eventRepository.create(buildEvent());
    await boardTermRepository.create(term);

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.boardTermId).toBe('term-1');
    expect(result.value.publicacaoStatus).toBe('rascunho');
  });

  it('deixa boardTermId nulo (sem bloquear o rascunho) quando não há Gestão para a data', async () => {
    const { useCase, eventRepository } = buildUseCase();
    await eventRepository.create(buildEvent());
    // nenhuma Gestão cadastrada

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.boardTermId).toBeNull();
    expect(result.value.publicacaoStatus).toBe('rascunho');
  });

  it('lança ForbiddenError quando falta a permissão archiveItem:create', async () => {
    const { useCase, eventRepository } = buildUseCase();
    await eventRepository.create(buildEvent());

    await expect(useCase.execute({ ...ctx, permissions: [] }, baseInput)).rejects.toThrow(
      ForbiddenError,
    );
  });
});
