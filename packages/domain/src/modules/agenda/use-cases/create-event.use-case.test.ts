import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { InMemoryBoardTermRepository } from '../../../test/fakes';
import type { BoardTerm } from '../../governance/entities/board-term.entity';
import type { Event } from '../entities/event.entity';
import type { IEventRepository } from '../repositories/event.repository';
import { CreateEventUseCase, type CreateEventInput } from './create-event.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: ['event:create'] };

class FakeEventRepository implements Partial<IEventRepository> {
  created: Event | null = null;
  async create(event: Event) {
    this.created = event;
  }
}

const clock: IClock = { now: () => new Date('2026-01-01T00:00:00Z') };
const idGenerator: IIdGenerator = { next: () => 'event-1' };

function buildInput(overrides: Partial<CreateEventInput> = {}): CreateEventInput {
  return {
    tipo: 'sessao',
    titulo: 'Sessão Ordinária',
    descricao: null,
    local: 'Sede da Loja',
    dataInicio: new Date('2026-02-01T20:00:00Z'),
    dataFim: new Date('2026-02-01T22:00:00Z'),
    exigeConfirmacaoPresenca: false,
    capacidadeMaxima: null,
    traje: null,
    chegadaSugerida: null,
    observacoes: null,
    arquivosRelacionados: [],
    boardTermId: null,
    nivelAcesso: 'irmaos',
    exibirNaLinhaDoTempo: true,
    ...overrides,
  };
}

describe('CreateEventUseCase', () => {
  it('rejeita quando dataFim não é posterior a dataInicio', async () => {
    const repo = new FakeEventRepository();
    const useCase = new CreateEventUseCase({
      eventRepository: repo as unknown as IEventRepository,
      boardTermRepository: new InMemoryBoardTermRepository(),
      clock,
      idGenerator,
    });

    const result = await useCase.execute(
      ctx,
      buildInput({
        dataInicio: new Date('2026-02-01T22:00:00Z'),
        dataFim: new Date('2026-02-01T20:00:00Z'),
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
    expect(repo.created).toBeNull();
  });

  it('cria o evento quando as datas são válidas', async () => {
    const repo = new FakeEventRepository();
    const useCase = new CreateEventUseCase({
      eventRepository: repo as unknown as IEventRepository,
      boardTermRepository: new InMemoryBoardTermRepository(),
      clock,
      idGenerator,
    });

    const result = await useCase.execute(ctx, buildInput());

    expect(result.ok).toBe(true);
    expect(repo.created?.id).toBe('event-1');
  });

  it('cria o evento sem dataFim (sessão sem horário de encerramento definido)', async () => {
    const repo = new FakeEventRepository();
    const useCase = new CreateEventUseCase({
      eventRepository: repo as unknown as IEventRepository,
      boardTermRepository: new InMemoryBoardTermRepository(),
      clock,
      idGenerator,
    });

    const result = await useCase.execute(ctx, buildInput({ dataFim: null }));

    expect(result.ok).toBe(true);
    expect(repo.created?.dataFim).toBeNull();
  });

  it('deriva boardTermId pela dataInicio, ignorando o valor recebido no input', async () => {
    const repo = new FakeEventRepository();
    const boardTermRepository = new InMemoryBoardTermRepository();
    const term: BoardTerm = {
      id: 'term-2026-2027',
      tenantId: 't1',
      nome: 'Gestão 2026/2027',
      periodoInicio: new Date('2026-01-01T00:00:00Z'),
      periodoFim: new Date('2027-12-31T23:59:59Z'),
      createdAt: new Date('2025-12-01'),
      updatedAt: new Date('2025-12-01'),
      createdBy: 'admin-1',
      updatedBy: 'admin-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await boardTermRepository.create(term);

    const useCase = new CreateEventUseCase({
      eventRepository: repo as unknown as IEventRepository,
      boardTermRepository,
      clock,
      idGenerator,
    });

    const result = await useCase.execute(ctx, buildInput({ boardTermId: 'outro-id' }));

    expect(result.ok).toBe(true);
    expect(repo.created?.boardTermId).toBe('term-2026-2027');
  });
});
