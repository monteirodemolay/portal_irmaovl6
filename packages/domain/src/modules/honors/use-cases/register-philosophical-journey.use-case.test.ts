import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, ValidationError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryPhilosophicalJourneyRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import {
  RegisterPhilosophicalJourneyUseCase,
  type RegisterPhilosophicalJourneyInput,
} from './register-philosophical-journey.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['honor:manage'],
};

const input: RegisterPhilosophicalJourneyInput = {
  memberId: 'member-1',
  rito: 'Rito Escocês Antigo e Aceito',
  corpoMaconico: 'Supremo Conselho',
  grau: 'Grau 33',
  instituicao: null,
  data: null,
  funcoesExercidas: null,
  visivel: false,
};

function buildUseCase() {
  const philosophicalJourneyRepository = new InMemoryPhilosophicalJourneyRepository();
  const useCase = new RegisterPhilosophicalJourneyUseCase({
    philosophicalJourneyRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, philosophicalJourneyRepository };
}

describe('RegisterPhilosophicalJourneyUseCase', () => {
  it('cadastra o grau filosófico como não visível por padrão da entrada', async () => {
    const { useCase, philosophicalJourneyRepository } = buildUseCase();

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.visivel).toBe(false);
    const stored = await philosophicalJourneyRepository.findById(result.value.id);
    expect(stored).not.toBeNull();
  });

  it('grava visivel true quando informado', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, { ...input, visivel: true });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.visivel).toBe(true);
  });

  it('rejeita quando o rito não é informado', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, { ...input, rito: '  ' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('lança ForbiddenError quando falta a permissão honor:manage', async () => {
    const { useCase } = buildUseCase();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, input)).rejects.toThrow(ForbiddenError);
  });
});
