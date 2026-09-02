import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryEventRepository } from '../../../test/fakes';
import type { Event } from '../entities/event.entity';
import { SeedSessionClassificationUseCase } from './seed-session-classification.use-case';

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
  const useCase = new SeedSessionClassificationUseCase({
    eventRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
  });
  return { useCase, eventRepository };
}

describe('SeedSessionClassificationUseCase', () => {
  it('classifica Sessões ainda não migradas e preserva o título original', async () => {
    const { useCase, eventRepository } = buildUseCase([
      buildEvent({ id: 'e1', titulo: 'Sessão Ordinária Administrativa' }),
      buildEvent({ id: 'e2', titulo: 'Sessão Magna de Iniciação', grau: 'aprendiz' }),
    ]);

    const report = await useCase.execute(ctx);

    expect(report.analisados).toBe(2);
    expect(report.migrados).toHaveLength(2);
    expect(report.pendentesRevisao).toBe(0);

    const e1 = await eventRepository.findById('e1');
    expect(e1?.sessionType).toBe('ordinaria');
    expect(e1?.sessionNature).toBe('administrativa');
    expect(e1?.titulo).toBe('Sessão Ordinária Administrativa');
    expect(e1?.legacySessionType).toContain('Sessão Ordinária Administrativa');
    expect(e1?.classificationReviewRequired).toBe(false);

    const e2 = await eventRepository.findById('e2');
    expect(e2?.sessionType).toBe('magna');
    expect(e2?.sessionNature).toBe('iniciacao');
    expect(e2?.degreeWork).toBe('aprendiz');
  });

  it('marca classificationReviewRequired quando o texto legado é ambíguo, nunca inventa', async () => {
    const { useCase, eventRepository } = buildUseCase([
      buildEvent({ id: 'e1', titulo: 'Verdadeira Luz recebe visitante ilustre' }),
    ]);

    const report = await useCase.execute(ctx);

    expect(report.pendentesRevisao).toBe(1);
    const e1 = await eventRepository.findById('e1');
    expect(e1?.classificationReviewRequired).toBe(true);
  });

  it('não reclassifica evento não-sessão nem Sessão já migrada (idempotência)', async () => {
    const { useCase } = buildUseCase([
      buildEvent({ id: 'e1', tipo: 'evento', titulo: 'Confraternização' }),
      buildEvent({ id: 'e2', titulo: 'Sessão Ordinária', sessionType: 'ordinaria' }),
    ]);

    const report = await useCase.execute(ctx);

    expect(report.analisados).toBe(1); // só e2 é sessão
    expect(report.pulados).toBe(1); // e2 já tinha sessionType
    expect(report.migrados).toHaveLength(0);
  });

  it('lança ForbiddenError sem a permissão event:manage', async () => {
    const { useCase } = buildUseCase([]);
    await expect(useCase.execute(readOnlyCtx)).rejects.toThrow(ForbiddenError);
  });
});
