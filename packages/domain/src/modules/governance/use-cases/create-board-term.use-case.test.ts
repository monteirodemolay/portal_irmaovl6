import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryArchiveItemRepository,
  InMemoryBoardTermRepository,
  InMemoryEventRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { BoardTerm } from '../entities/board-term.entity';
import { CreateBoardTermUseCase } from './create-board-term.use-case';

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

const existingTerm: BoardTerm = {
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
  const boardTermRepository = new InMemoryBoardTermRepository();
  const eventRepository = new InMemoryEventRepository();
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const useCase = new CreateBoardTermUseCase({
    boardTermRepository,
    eventRepository,
    archiveItemRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, boardTermRepository, eventRepository, archiveItemRepository };
}

describe('CreateBoardTermUseCase', () => {
  it('cria uma gestão anual com período válido', async () => {
    const { useCase, boardTermRepository } = buildUseCase();

    const result = await useCase.execute(ctx, {
      nome: 'Gestão 2026/2027',
      periodoInicio: new Date('2026-01-01'),
      periodoFim: new Date('2026-12-31'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe('id-1');
    expect(result.value.nome).toBe('Gestão 2026/2027');

    const stored = await boardTermRepository.findById('id-1');
    expect(stored).not.toBeNull();
  });

  it('lança ForbiddenError quando falta a permissão boardTerm:manage', async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute(readOnlyCtx, {
        nome: 'Gestão 2026/2027',
        periodoInicio: new Date('2026-01-01'),
        periodoFim: new Date('2026-12-31'),
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('rejeita período final anterior ou igual ao inicial', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, {
      nome: 'Gestão inválida',
      periodoInicio: new Date('2026-12-31'),
      periodoFim: new Date('2026-01-01'),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });

  it('rejeita período que se sobrepõe a uma gestão existente', async () => {
    const { useCase, boardTermRepository } = buildUseCase();
    await boardTermRepository.create(existingTerm);

    const result = await useCase.execute(ctx, {
      nome: 'Gestão sobreposta',
      periodoInicio: new Date('2025-06-01'),
      periodoFim: new Date('2026-06-01'),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });

  it('permite período sobreposto quando `permitirSobreposicao` é true', async () => {
    const { useCase, boardTermRepository } = buildUseCase();
    await boardTermRepository.create(existingTerm);

    const result = await useCase.execute(ctx, {
      nome: '2012/2013 (2ª gestão)',
      periodoInicio: new Date('2025-06-01'),
      periodoFim: new Date('2026-06-01'),
      permitirSobreposicao: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nome).toBe('2012/2013 (2ª gestão)');
  });

  it('vincula sozinha Eventos/itens do Acervo VL6 órfãos que caem dentro do novo período', async () => {
    const { useCase, eventRepository, archiveItemRepository } = buildUseCase();
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

    const result = await useCase.execute(ctx, {
      nome: 'Gestão 2026/2027',
      periodoInicio: new Date('2026-06-01'),
      periodoFim: new Date('2027-05-31'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const event = await eventRepository.findById('event-orfao');
    expect(event?.boardTermId).toBe(result.value.id);
    const item = await archiveItemRepository.findById('item-orfao');
    expect(item?.boardTermId).toBe(result.value.id);
  });
});
