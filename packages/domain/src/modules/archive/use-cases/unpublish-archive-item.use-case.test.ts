import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError, ValidationError } from '../../../shared/result';
import { FixedClock, InMemoryArchiveItemRepository } from '../../../test/fakes';
import type { ArchiveItem } from '../entities/archive-item.entity';
import { UnpublishArchiveItemUseCase } from './unpublish-archive-item.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveItem:publish'],
};

function buildItem(overrides: Partial<ArchiveItem> = {}): ArchiveItem {
  return {
    id: 'item-1',
    tenantId: 't1',
    eventId: 'event-1',
    boardTermId: 'term-1',
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
    ...overrides,
  };
}

function buildUseCase() {
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const useCase = new UnpublishArchiveItemUseCase({
    archiveItemRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
  });
  return { useCase, archiveItemRepository };
}

describe('UnpublishArchiveItemUseCase', () => {
  it('retira o item publicado de circulação (volta para oculto)', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem());

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicacaoStatus).toBe('oculto');
  });

  it('rejeita item que não está publicado', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ publicacaoStatus: 'rascunho' }));

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('rejeita item inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'nao-existe');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('isolamento de tenant', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ tenantId: 't2' }));

    const result = await useCase.execute(ctx, 'item-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta a permissão archiveItem:publish', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem());

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'item-1')).rejects.toThrow(
      ForbiddenError,
    );
  });
});
