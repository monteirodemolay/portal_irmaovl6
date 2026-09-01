import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryArchiveItemRepository } from '../../../test/fakes';
import type { ArchiveItem } from '../entities/archive-item.entity';
import { SetArchiveItemInstagramLinkUseCase } from './set-archive-item-instagram-link.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveItem:update'],
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
  const useCase = new SetArchiveItemInstagramLinkUseCase({
    archiveItemRepository,
    clock: new FixedClock(new Date('2026-03-01')),
  });
  return { useCase, archiveItemRepository };
}

describe('SetArchiveItemInstagramLinkUseCase', () => {
  it('grava o link do Instagram no item', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem());

    const result = await useCase.execute(ctx, 'item-1', 'https://instagram.com/p/abc123');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.instagramUrl).toBe('https://instagram.com/p/abc123');
    expect(result.value.updatedAt).toEqual(new Date('2026-03-01'));
  });

  it('limpa o link quando recebe null', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ instagramUrl: 'https://instagram.com/p/old' }));

    const result = await useCase.execute(ctx, 'item-1', null);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.instagramUrl).toBeNull();
  });

  it('retorna NotFoundError quando o item não existe no tenant', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'item-inexistente', 'https://instagram.com/p/abc');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
