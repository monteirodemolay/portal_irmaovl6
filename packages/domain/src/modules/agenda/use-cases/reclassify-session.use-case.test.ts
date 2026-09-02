import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/result';
import { FixedClock, InMemoryEventRepository } from '../../../test/fakes';
import type { Event } from '../entities/event.entity';
import { ReclassifySessionUseCase } from './reclassify-session.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['event:manage'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['event:read'],
};

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'e1',
    tenantId: 't1',
    tipo: 'sessao',
    titulo: 'Verdadeira Luz recebe visitante ilustre',
    descricao: null,
    local: 'Sede da Loja',
    dataInicio: new Date('2020-01-01T20:00:00Z'),
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
    classificationReviewRequired: true,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase(events: Event[]) {
  const eventRepository = new InMemoryEventRepository();
  for (const event of events) eventRepository.create(event);
  const useCase = new ReclassifySessionUseCase({
    eventRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
  });
  return { useCase, eventRepository };
}

describe('ReclassifySessionUseCase', () => {
  it('grava a classificação e limpa classificationReviewRequired, sem tocar no título', async () => {
    const { useCase, eventRepository } = buildUseCase([buildEvent()]);

    const result = await useCase.execute(ctx, 'e1', {
      sessionType: 'extraordinaria',
      sessionNature: 'assunto_especifico',
      degreeWork: 'nao_se_aplica',
      access: 'privativa_macons',
    });

    expect(result.ok).toBe(true);
    const updated = await eventRepository.findById('e1');
    expect(updated?.sessionType).toBe('extraordinaria');
    expect(updated?.sessionNature).toBe('assunto_especifico');
    expect(updated?.classificationReviewRequired).toBe(false);
    expect(updated?.titulo).toBe('Verdadeira Luz recebe visitante ilustre');
  });

  it('retorna NotFoundError para evento inexistente', async () => {
    const { useCase } = buildUseCase([]);
    const result = await useCase.execute(ctx, 'missing', {
      sessionType: 'ordinaria',
      sessionNature: 'regular',
      degreeWork: null,
      access: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('retorna ValidationError para evento que não é Sessão', async () => {
    const { useCase } = buildUseCase([buildEvent({ tipo: 'evento' })]);
    const result = await useCase.execute(ctx, 'e1', {
      sessionType: 'ordinaria',
      sessionNature: 'regular',
      degreeWork: null,
      access: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('lança ForbiddenError sem a permissão event:manage', async () => {
    const { useCase } = buildUseCase([buildEvent()]);
    await expect(
      useCase.execute(readOnlyCtx, 'e1', {
        sessionType: 'ordinaria',
        sessionNature: 'regular',
        degreeWork: null,
        access: null,
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});
