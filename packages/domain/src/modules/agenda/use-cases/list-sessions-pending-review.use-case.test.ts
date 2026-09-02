import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryEventRepository } from '../../../test/fakes';
import type { Event } from '../entities/event.entity';
import { ListSessionsPendingReviewUseCase } from './list-sessions-pending-review.use-case';

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
    titulo: 'Sessão Ordinária',
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
  return new ListSessionsPendingReviewUseCase({ eventRepository });
}

describe('ListSessionsPendingReviewUseCase', () => {
  it('lista só Sessões com classificationReviewRequired', async () => {
    const useCase = buildUseCase([
      buildEvent({ id: 'e1', classificationReviewRequired: true }),
      buildEvent({ id: 'e2', sessionType: 'ordinaria', classificationReviewRequired: false }),
      buildEvent({ id: 'e3', tipo: 'evento', classificationReviewRequired: true }),
    ]);

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('e1');
  });

  it('ordena por data de início mais recente primeiro', async () => {
    const useCase = buildUseCase([
      buildEvent({
        id: 'older',
        classificationReviewRequired: true,
        dataInicio: new Date('2020-01-01'),
      }),
      buildEvent({
        id: 'newer',
        classificationReviewRequired: true,
        dataInicio: new Date('2020-06-01'),
      }),
    ]);

    const result = await useCase.execute(ctx);

    expect(result.map((event) => event.id)).toEqual(['newer', 'older']);
  });

  it('lança ForbiddenError sem a permissão event:manage', async () => {
    const useCase = buildUseCase([]);
    await expect(useCase.execute(readOnlyCtx)).rejects.toThrow(ForbiddenError);
  });
});
