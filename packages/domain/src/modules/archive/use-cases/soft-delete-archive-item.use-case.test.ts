import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryArchiveItemRepository } from '../../../test/fakes';
import type { ArchiveItem } from '../entities/archive-item.entity';
import { SoftDeleteArchiveItemUseCase } from './soft-delete-archive-item.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveItem:delete'],
};

const item: ArchiveItem = {
  id: 'item-1',
  tenantId: 't1',
  eventId: 'event-1',
  boardTermId: null,
  titulo: 'Fotos da Sessão',
  tipo: 'fotografia',
  descricao: null,
  publicacaoStatus: 'publicado',
  nivelAcesso: 'irmaos',
  capaMediaId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

function buildUseCase() {
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const useCase = new SoftDeleteArchiveItemUseCase({
    archiveItemRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
  });
  return { useCase, archiveItemRepository };
}

describe('SoftDeleteArchiveItemUseCase', () => {
  it('move o item para a lixeira (soft delete), nunca exclusão física', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(item);

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(true);
    const stored = await archiveItemRepository.findById('item-1');
    expect(stored?.deletedAt).not.toBeNull();
    expect(stored?.ativo).toBe(false);
  });

  it('rejeita item inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'nao-existe');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('isolamento de tenant: não exclui item de outro tenant', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create({ ...item, tenantId: 't2' });

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta a permissão archiveItem:delete', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(item);

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'item-1')).rejects.toThrow(
      ForbiddenError,
    );
  });
});
