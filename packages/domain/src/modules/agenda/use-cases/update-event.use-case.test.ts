import { describe, expect, it } from 'vitest';
import type { EventFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryBoardTermRepository,
  InMemoryEventRepository,
} from '../../../test/fakes';
import type { BoardTerm } from '../../governance/entities/board-term.entity';
import type { Event } from '../entities/event.entity';
import { UpdateEventUseCase } from './update-event.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['event:update'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['event:read'],
};

const baseEvent: Event = {
  id: 'event-1',
  tenantId: 't1',
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
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

const input: EventFormValues = {
  tipo: 'sessao',
  titulo: 'Sessão Ordinária Editada',
  descricao: null,
  local: 'Sede da Loja',
  dataInicio: new Date('2026-02-01T20:00:00Z'),
  dataFim: new Date('2026-02-01T22:00:00Z'),
  exigeConfirmacaoPresenca: false,
  capacidadeMaxima: null,
  traje: 'Social completo',
  chegadaSugerida: '19:30',
  observacoes: 'Levar caderno',
  arquivosRelacionados: ['file_abc'],
  boardTermId: null,
  nivelAcesso: 'irmaos',
  exibirNaLinhaDoTempo: true,
};

function buildUseCase() {
  const eventRepository = new InMemoryEventRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const useCase = new UpdateEventUseCase({
    eventRepository,
    boardTermRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, eventRepository, boardTermRepository };
}

describe('UpdateEventUseCase', () => {
  it('atualiza os dados do evento', async () => {
    const { useCase, eventRepository } = buildUseCase();
    await eventRepository.create(baseEvent);

    const result = await useCase.execute(ctx, 'event-1', input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.titulo).toBe('Sessão Ordinária Editada');
    expect(result.value.traje).toBe('Social completo');
    expect(result.value.arquivosRelacionados).toEqual(['file_abc']);
    expect(result.value.updatedAt).toEqual(new Date('2026-06-01T00:00:00Z'));

    const stored = await eventRepository.findById('event-1');
    expect(stored?.titulo).toBe('Sessão Ordinária Editada');
  });

  it('lança ForbiddenError quando falta a permissão event:update', async () => {
    const { useCase, eventRepository } = buildUseCase();
    await eventRepository.create(baseEvent);

    await expect(useCase.execute(readOnlyCtx, 'event-1', input)).rejects.toThrow(ForbiddenError);
  });

  it('retorna NotFoundError quando o evento não existe no tenant', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'inexistente', input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('rejeita quando dataFim não é posterior a dataInicio', async () => {
    const { useCase, eventRepository } = buildUseCase();
    await eventRepository.create(baseEvent);

    const result = await useCase.execute(ctx, 'event-1', {
      ...input,
      dataInicio: new Date('2026-02-01T22:00:00Z'),
      dataFim: new Date('2026-02-01T20:00:00Z'),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });

  it('permite salvar sem dataFim (sessão sem horário de encerramento definido)', async () => {
    const { useCase, eventRepository } = buildUseCase();
    await eventRepository.create(baseEvent);

    const result = await useCase.execute(ctx, 'event-1', { ...input, dataFim: null });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.dataFim).toBeNull();
  });

  it('recalcula boardTermId pela nova dataInicio, ignorando o valor recebido no input', async () => {
    const { useCase, eventRepository, boardTermRepository } = buildUseCase();
    await eventRepository.create(baseEvent);
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

    const result = await useCase.execute(ctx, 'event-1', { ...input, boardTermId: 'outro-id' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.boardTermId).toBe('term-2026-2027');
  });
});
