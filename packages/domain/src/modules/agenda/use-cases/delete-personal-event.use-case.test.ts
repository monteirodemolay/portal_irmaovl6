import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryPersonalEventRepository } from '../../../test/fakes';
import type { PersonalEvent } from '../entities/personal-event.entity';
import { DeletePersonalEventUseCase } from './delete-personal-event.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };
const otherUserCtx: AuthContext = { uid: 'u2', tenantId: 't1', roleId: 'r1', permissions: [] };

const baseEvent: PersonalEvent = {
  id: 'pe-1',
  tenantId: 't1',
  userId: 'u1',
  titulo: 'Dentista',
  descricao: null,
  local: null,
  dataInicio: new Date('2026-08-18T09:00:00Z'),
  dataFim: new Date('2026-08-18T10:00:00Z'),
  lembreteMinutosAntes: null,
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

function buildUseCase() {
  const personalEventRepository = new InMemoryPersonalEventRepository();
  const useCase = new DeletePersonalEventUseCase({
    personalEventRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
  });
  return { useCase, personalEventRepository };
}

describe('DeletePersonalEventUseCase', () => {
  it('faz soft delete do compromisso do próprio dono', async () => {
    const { useCase, personalEventRepository } = buildUseCase();
    await personalEventRepository.create(baseEvent);

    const result = await useCase.execute(ctx, 'pe-1');

    expect(result.ok).toBe(true);
    const stored = await personalEventRepository.findById('pe-1');
    expect(stored?.deletedAt).toEqual(new Date('2026-08-10T00:00:00Z'));
    expect(stored?.ativo).toBe(false);
  });

  it('retorna NotFoundError quando o compromisso é de outro usuário', async () => {
    const { useCase, personalEventRepository } = buildUseCase();
    await personalEventRepository.create(baseEvent);

    const result = await useCase.execute(otherUserCtx, 'pe-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
