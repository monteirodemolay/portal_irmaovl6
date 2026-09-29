import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryArchiveItemRepository,
  InMemoryBoardTermRepository,
  InMemoryEventRepository,
  InMemoryTenantRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateInitiationArchiveItemUseCase } from './create-initiation-archive-item.use-case';
import { RemoveMemberFromCeremonyArchiveItemUseCase } from './remove-member-from-ceremony-archive-item.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:update'],
};

function buildUseCases() {
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const eventRepository = new InMemoryEventRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const tenantRepository = new InMemoryTenantRepository();
  const clock = new FixedClock(new Date('2026-01-01T00:00:00Z'));

  const createInitiation = new CreateInitiationArchiveItemUseCase({
    archiveItemRepository,
    eventRepository,
    boardTermRepository,
    tenantRepository,
    clock,
    idGenerator: new SequentialIdGenerator(),
  });
  const removeFromCeremony = new RemoveMemberFromCeremonyArchiveItemUseCase({
    archiveItemRepository,
    eventRepository,
    clock,
  });

  return { createInitiation, removeFromCeremony, archiveItemRepository, eventRepository };
}

describe('RemoveMemberFromCeremonyArchiveItemUseCase', () => {
  it('remove o Irmão da lista da sessão do dia antigo, sem apagar o item nem os demais colegas', async () => {
    const { createInitiation, removeFromCeremony, archiveItemRepository } = buildUseCases();

    await createInitiation.execute(ctx, {
      memberId: 'membro-a',
      nomeCompleto: 'João da Silva',
      dataIniciacao: new Date('2025-06-15T12:00:00Z'),
    });
    const second = await createInitiation.execute(ctx, {
      memberId: 'membro-b',
      nomeCompleto: 'Maria Souza',
      dataIniciacao: new Date('2025-06-15T09:00:00Z'),
    });
    expect(second.archiveItem.origemIniciacaoMemberIds).toEqual(['membro-a', 'membro-b']);

    await removeFromCeremony.execute(ctx, {
      memberId: 'membro-a',
      tipo: 'iniciacao',
      previousDate: new Date('2025-06-15T12:00:00Z'),
    });

    const updated = await archiveItemRepository.findById(second.archiveItem.id);
    expect(updated?.origemIniciacaoMemberIds).toEqual(['membro-b']);
  });

  it('não faz nada quando não existe sessão nenhuma na data antiga (sem erro)', async () => {
    const { removeFromCeremony } = buildUseCases();

    await expect(
      removeFromCeremony.execute(ctx, {
        memberId: 'membro-x',
        tipo: 'elevacao',
        previousDate: new Date('2020-01-01T00:00:00Z'),
      }),
    ).resolves.toBeUndefined();
  });

  it('não faz nada quando o Irmão já não está na lista (idempotente)', async () => {
    const { createInitiation, removeFromCeremony, archiveItemRepository } = buildUseCases();

    const created = await createInitiation.execute(ctx, {
      memberId: 'membro-a',
      nomeCompleto: 'João da Silva',
      dataIniciacao: new Date('2025-06-15T12:00:00Z'),
    });

    await removeFromCeremony.execute(ctx, {
      memberId: 'membro-a',
      tipo: 'iniciacao',
      previousDate: new Date('2025-06-15T12:00:00Z'),
    });
    // Segunda remoção do mesmo Irmão — já não está na lista, nada deve mudar.
    await removeFromCeremony.execute(ctx, {
      memberId: 'membro-a',
      tipo: 'iniciacao',
      previousDate: new Date('2025-06-15T12:00:00Z'),
    });

    const updated = await archiveItemRepository.findById(created.archiveItem.id);
    expect(updated?.origemIniciacaoMemberIds).toEqual([]);
  });
});
