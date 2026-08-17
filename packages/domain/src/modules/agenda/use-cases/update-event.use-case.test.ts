import { describe, expect, it } from 'vitest';
import type { EventFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryEventRepository } from '../../../test/fakes';
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
};

function buildUseCase() {
  const eventRepository = new InMemoryEventRepository();
  const useCase = new UpdateEventUseCase({
    eventRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, eventRepository };
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
});
