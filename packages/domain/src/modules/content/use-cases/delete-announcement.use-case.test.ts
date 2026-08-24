import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryAnnouncementRepository } from '../../../test/fakes';
import type { Announcement } from '../entities/announcement.entity';
import { DeleteAnnouncementUseCase } from './delete-announcement.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['announcement:manage'],
};

function buildAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: 'aviso-1',
    tenantId: 't1',
    titulo: 'Aviso',
    descricao: 'Descrição',
    prioridade: 'media',
    publicado: true,
    destacar: false,
    dataPublicacao: null,
    dataExpiracao: null,
    requiresAcknowledgement: false,
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

describe('DeleteAnnouncementUseCase', () => {
  it('marca deletedAt e some da listagem principal, mas continua existindo', async () => {
    const announcementRepository = new InMemoryAnnouncementRepository();
    await announcementRepository.create(buildAnnouncement());
    const useCase = new DeleteAnnouncementUseCase({
      announcementRepository,
      clock: new FixedClock(new Date('2026-03-01')),
    });

    const result = await useCase.execute(ctx, 'aviso-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.deletedAt).toEqual(new Date('2026-03-01'));

    const activeList = await announcementRepository.listAllActive('t1');
    expect(activeList).toHaveLength(0);
    expect(await announcementRepository.findById('aviso-1')).not.toBeNull();
  });
});
