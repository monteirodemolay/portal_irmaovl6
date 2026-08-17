import { describe, expect, it } from 'vitest';
import type { PersonalEventFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryPersonalEventRepository } from '../../../test/fakes';
import type { PersonalEvent } from '../entities/personal-event.entity';
import { UpdatePersonalEventUseCase } from './update-personal-event.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };
const otherUserCtx: AuthContext = { uid: 'u2', tenantId: 't1', roleId: 'r1', permissions: [] };

const baseEvent: PersonalEvent = {
  id: 'pe-1',
  tenantId: 't1',
  userId: 'u1',
  titulo: 'Dentista',
  descricao: null,
  local: 'Clínica Odontológica',
  dataInicio: new Date('2026-08-18T09:00:00Z'),
  dataFim: new Date('2026-08-18T10:00:00Z'),
  lembreteMinutosAntes: 30,
  sincronizarComGoogle: false,
  googleEventId: null,
  createdAt: new Date('2026-08-01'),
  updatedAt: new Date('2026-08-01'),
  createdBy: 'u1',
  updatedBy: 'u1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

const input: PersonalEventFormValues = {
  titulo: 'Dentista — remarcado',
  descricao: 'Levar exame',
  local: 'Clínica Odontológica',
  dataInicio: new Date('2026-08-19T09:00:00Z'),
  dataFim: new Date('2026-08-19T10:00:00Z'),
  lembreteMinutosAntes: 60,
  sincronizarComGoogle: true,
};

function buildUseCase() {
  const personalEventRepository = new InMemoryPersonalEventRepository();
  const useCase = new UpdatePersonalEventUseCase({
    personalEventRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
  });
  return { useCase, personalEventRepository };
}

describe('UpdatePersonalEventUseCase', () => {
  it('atualiza os dados do compromisso do próprio dono', async () => {
    const { useCase, personalEventRepository } = buildUseCase();
    await personalEventRepository.create(baseEvent);

    const result = await useCase.execute(ctx, 'pe-1', input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.titulo).toBe('Dentista — remarcado');
    expect(result.value.sincronizarComGoogle).toBe(true);
    expect(result.value.updatedAt).toEqual(new Date('2026-08-10T00:00:00Z'));
  });

  it('retorna NotFoundError quando o compromisso é de outro usuário', async () => {
    const { useCase, personalEventRepository } = buildUseCase();
    await personalEventRepository.create(baseEvent);

    const result = await useCase.execute(otherUserCtx, 'pe-1', input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('retorna NotFoundError quando o compromisso não existe', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'inexistente', input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('rejeita quando dataFim não é posterior a dataInicio', async () => {
    const { useCase, personalEventRepository } = buildUseCase();
    await personalEventRepository.create(baseEvent);

    const result = await useCase.execute(ctx, 'pe-1', {
      ...input,
      dataInicio: new Date('2026-08-19T10:00:00Z'),
      dataFim: new Date('2026-08-19T09:00:00Z'),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });
});
