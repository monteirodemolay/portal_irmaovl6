import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import { InMemoryArchiveItemRepository } from '../../../test/fakes';
import type { ArchiveItem } from '../entities/archive-item.entity';
import { RestoreArchiveItemUseCase } from './restore-archive-item.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveItem:delete'],
};

const deletedItem: ArchiveItem = {
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
  updatedAt: new Date('2026-02-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: new Date('2026-02-01'),
  status: 'archived',
  ativo: false,
};

function buildUseCase() {
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const useCase = new RestoreArchiveItemUseCase({ archiveItemRepository });
  return { useCase, archiveItemRepository };
}

describe('RestoreArchiveItemUseCase', () => {
  it('restaura o item da lixeira, limpando deletedAt', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(deletedItem);

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(true);
    const stored = await archiveItemRepository.findById('item-1');
    expect(stored?.deletedAt).toBeNull();
    expect(stored?.ativo).toBe(true);
  });

  it('rejeita item inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'nao-existe');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta a permissão archiveItem:delete', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(deletedItem);

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'item-1')).rejects.toThrow(
      ForbiddenError,
    );
  });
});
