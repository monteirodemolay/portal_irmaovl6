import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  InMemoryArchiveCollectionRepository,
  InMemoryArchiveItemRepository,
  InMemoryBoardTermRepository,
  InMemoryEventRepository,
  InMemoryMemberRepository,
} from '../../../test/fakes';
import type { ArchiveCollection } from '../entities/archive-collection.entity';
import type { ArchiveItem } from '../entities/archive-item.entity';
import { GetConstellationRootsUseCase } from './get-constellation-roots.use-case';

const ctx: AuthContext = {
  uid: 'u1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveRelation:read'],
};

const adminCtx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['archiveRelation:read', 'archiveItem:manage'],
};

const noPermCtx: AuthContext = {
  uid: 'u2',
  tenantId: 't1',
  roleId: 'r3',
  permissions: [],
};

function buildItem(overrides: Partial<ArchiveItem> = {}): ArchiveItem {
  return {
    id: 'item-1',
    tenantId: 't1',
    eventId: 'event-1',
    boardTermId: null,
    titulo: 'Item',
    tipo: 'fotografia',
    descricao: null,
    nivelAcesso: 'irmaos',
    publicacaoStatus: 'publicado',
    capaMediaId: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildCollection(overrides: Partial<ArchiveCollection> = {}): ArchiveCollection {
  return {
    id: 'col-1',
    tenantId: 't1',
    titulo: 'Coleção',
    slug: 'colecao',
    descricaoEditorial: null,
    curadoPor: null,
    capaUrl: null,
    itemIds: [],
    publicado: true,
    ordem: 0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
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
  const memberRepository = new InMemoryMemberRepository();
  const eventRepository = new InMemoryEventRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const archiveCollectionRepository = new InMemoryArchiveCollectionRepository();
  const useCase = new GetConstellationRootsUseCase({
    archiveItemRepository,
    memberRepository,
    eventRepository,
    boardTermRepository,
    archiveCollectionRepository,
  });
  return {
    useCase,
    archiveItemRepository,
    memberRepository,
    eventRepository,
    boardTermRepository,
    archiveCollectionRepository,
  };
}

describe('GetConstellationRootsUseCase', () => {
  it('omite grupos sem conteúdo e conta os que têm', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ id: 'i1', tipo: 'fotografia' }));
    await archiveItemRepository.create(buildItem({ id: 'i2', tipo: 'fotografia' }));
    await archiveItemRepository.create(buildItem({ id: 'i3', tipo: 'documento' }));

    const result = await useCase.execute(ctx);

    const groupIds = result.groups.map((g) => g.id);
    expect(groupIds).toContain('archiveItem:fotografia');
    expect(groupIds).toContain('archiveItem:documento');
    expect(groupIds).not.toContain('archiveItem:audiovisual');
    expect(groupIds).not.toContain('member');
    expect(groupIds).not.toContain('event');
    expect(groupIds).not.toContain('boardTerm');
    expect(groupIds).not.toContain('archiveCollection');

    const fotografias = result.groups.find((g) => g.id === 'archiveItem:fotografia');
    expect(fotografias?.childCount).toBe(2);
    expect(result.root.expandable).toBe(true);
  });

  it('não conta item rascunho nem excluído no grupo', async () => {
    const { useCase, archiveItemRepository } = buildUseCase();
    await archiveItemRepository.create(buildItem({ id: 'i1', tipo: 'fotografia' }));
    await archiveItemRepository.create(
      buildItem({ id: 'i2', tipo: 'fotografia', publicacaoStatus: 'rascunho' }),
    );

    const result = await useCase.execute(ctx);
    const fotografias = result.groups.find((g) => g.id === 'archiveItem:fotografia');
    expect(fotografias?.childCount).toBe(1);
  });

  it('só mostra coleção não publicada pra quem tem archiveItem:manage', async () => {
    const { useCase, archiveCollectionRepository } = buildUseCase();
    await archiveCollectionRepository.create(buildCollection({ id: 'c1', publicado: false }));

    const semAcesso = await useCase.execute(ctx);
    expect(semAcesso.groups.some((g) => g.id === 'archiveCollection')).toBe(false);

    const comAcesso = await useCase.execute(adminCtx);
    expect(comAcesso.groups.some((g) => g.id === 'archiveCollection')).toBe(true);
  });

  it('lança ForbiddenError sem a permissão archiveRelation:read', async () => {
    const { useCase } = buildUseCase();
    await expect(useCase.execute(noPermCtx)).rejects.toThrow(ForbiddenError);
  });
});
