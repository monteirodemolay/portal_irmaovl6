import { describe, expect, it } from 'vitest';
import type { PersonalEventFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryPersonalEventRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreatePersonalEventUseCase } from './create-personal-event.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

const input: PersonalEventFormValues = {
  titulo: 'Dentista',
  descricao: null,
  local: 'Clínica Odontológica',
  dataInicio: new Date('2026-08-18T09:00:00Z'),
  dataFim: new Date('2026-08-18T10:00:00Z'),
  lembreteMinutosAntes: 30,
  sincronizarComGoogle: false,
};

function buildUseCase() {
  const personalEventRepository = new InMemoryPersonalEventRepository();
  const useCase = new CreatePersonalEventUseCase({
    personalEventRepository,
    clock: new FixedClock(new Date('2026-08-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, personalEventRepository };
}

describe('CreatePersonalEventUseCase', () => {
  it('não exige permissão de RBAC — é uma ação pessoal', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
  });

  it('cria o compromisso vinculado ao próprio usuário', async () => {
    const { useCase, personalEventRepository } = buildUseCase();

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.userId).toBe('u1');
    expect(result.value.tenantId).toBe('t1');
    expect(result.value.googleEventId).toBeNull();

    const stored = await personalEventRepository.findById(result.value.id);
    expect(stored?.titulo).toBe('Dentista');
  });

  it('rejeita quando dataFim não é posterior a dataInicio', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, {
      ...input,
      dataInicio: new Date('2026-08-18T10:00:00Z'),
      dataFim: new Date('2026-08-18T09:00:00Z'),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });
});
