import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryArchiveItemRepository } from '../../../test/fakes';
import type { ArchiveItem } from '../entities/archive-item.entity';
import { ListMostViewedArchiveItemsUseCase } from './list-most-viewed-archive-items.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveItem:read'],
};

function buildItem(overrides: Partial<ArchiveItem> = {}): ArchiveItem {
  return {
    id: 'item-1',
    tenantId: 't1',
    eventId: 'event-1',
    boardTermId: 'term-1',
    titulo: 'Item',
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
  const useCase = new ListMostViewedArchiveItemsUseCase({ archiveItemRepository });
  return { useCase, archiveItemRepository };
}

describe('ListMostViewedArchiveItemsUseCase', () => {
  it('ordena por contagemVisualizacoes desc e respeita o limite', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ id: 'item-a', contagemVisualizacoes: 5 }));
    await archiveItemRepository.create(buildItem({ id: 'item-b', contagemVisualizacoes: 20 }));
    await archiveItemRepository.create(buildItem({ id: 'item-c', contagemVisualizacoes: 10 }));

    const result = await useCase.execute(ctx, 2);

    expect(result.map((i) => i.id)).toEqual(['item-b', 'item-c']);
  });

  it('trata contagemVisualizacoes ausente como 0', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ id: 'item-a' }));
    await archiveItemRepository.create(buildItem({ id: 'item-b', contagemVisualizacoes: 3 }));

    const result = await useCase.execute(ctx, 10);

    expect(result.map((i) => i.id)).toEqual(['item-b', 'item-a']);
  });

  it('ignora itens em rascunho', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(
      buildItem({ id: 'item-rascunho', publicacaoStatus: 'rascunho', contagemVisualizacoes: 100 }),
    );
    await archiveItemRepository.create(
      buildItem({ id: 'item-publicado', contagemVisualizacoes: 1 }),
    );

    const result = await useCase.execute(ctx, 10);

    expect(result.map((i) => i.id)).toEqual(['item-publicado']);
  });

  it('lança ForbiddenError quando falta a permissão archiveItem:read', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ ...ctx, permissions: [] }, 5)).rejects.toThrow(ForbiddenError);
  });
});
