import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveItemRepository,
  InMemoryBoardTermRepository,
  InMemoryEventRepository,
} from '../../../test/fakes';
import type { BoardTerm } from '../entities/board-term.entity';
import { UpdateBoardTermUseCase } from './update-board-term.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['boardTerm:manage'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['boardTerm:read'],
};

const term: BoardTerm = {
  id: 'term-1',
  tenantId: 't1',
  nome: 'Gestão 2026/2027',
  periodoInicio: new Date('2026-06-01'),
  periodoFim: new Date('2027-05-31'),
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

function buildUseCase() {
  const boardTermRepository = new InMemoryBoardTermRepository();
  const eventRepository = new InMemoryEventRepository();
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const useCase = new UpdateBoardTermUseCase({
    boardTermRepository,
    eventRepository,
    archiveItemRepository,
    clock: new FixedClock(new Date('2026-09-01T00:00:00Z')),
  });
  return { useCase, boardTermRepository, eventRepository, archiveItemRepository };
}

describe('UpdateBoardTermUseCase', () => {
  it('edita nome e período', async () => {
    const { useCase, boardTermRepository } = buildUseCase();
    await boardTermRepository.create(term);

    const result = await useCase.execute(ctx, 'term-1', {
      nome: '2026/2027',
      periodoInicio: term.periodoInicio,
      periodoFim: term.periodoFim,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nome).toBe('2026/2027');
  });

  it('retorna NotFoundError pra gestão inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'nao-existe', {
      nome: 'X',
      periodoInicio: new Date('2026-01-01'),
      periodoFim: new Date('2026-12-31'),
    });

    expect(result.ok).toBe(false);
  });

  it('lança ForbiddenError sem a permissão boardTerm:manage', async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute(readOnlyCtx, 'term-1', {
        nome: 'X',
        periodoInicio: new Date('2026-01-01'),
        periodoFim: new Date('2026-12-31'),
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('vincula sozinha Eventos/itens do Acervo VL6 órfãos que passam a cair dentro do período editado', async () => {
    const { useCase, boardTermRepository, eventRepository, archiveItemRepository } = buildUseCase();
    await boardTermRepository.create(term);
    await eventRepository.create({
      id: 'event-orfao',
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
    });
    await archiveItemRepository.create({
      id: 'item-orfao',
      tenantId: 't1',
      eventId: 'event-orfao',
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
    });

    // O período original (jun/2026–mai/2027) já cobre 29/08/2026, mas o
    // Evento nasceu antes de a Gestão existir — corrigir só o nome (sem
    // mudar as datas) já deve disparar o relink.
    const result = await useCase.execute(ctx, 'term-1', {
      nome: '2026/2027',
      periodoInicio: term.periodoInicio,
      periodoFim: term.periodoFim,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const event = await eventRepository.findById('event-orfao');
    expect(event?.boardTermId).toBe('term-1');
    const item = await archiveItemRepository.findById('item-orfao');
    expect(item?.boardTermId).toBe('term-1');
  });
});
