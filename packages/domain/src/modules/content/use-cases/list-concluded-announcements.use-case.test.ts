import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryAnnouncementRepository } from '../../../test/fakes';
import type { Announcement } from '../entities/announcement.entity';
import { ListConcludedAnnouncementsUseCase } from './list-concluded-announcements.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['announcement:read'],
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

describe('ListConcludedAnnouncementsUseCase', () => {
  it('inclui vencidos e excluídos, mas não avisos ativos', async () => {
    const announcementRepository = new InMemoryAnnouncementRepository();
    await announcementRepository.create(
      buildAnnouncement({ id: 'vencido', dataExpiracao: new Date('2026-01-15') }),
    );
    await announcementRepository.create(
      buildAnnouncement({ id: 'excluido', deletedAt: new Date('2026-01-20') }),
    );
    await announcementRepository.create(buildAnnouncement({ id: 'ativo' }));
    const useCase = new ListConcludedAnnouncementsUseCase({
      announcementRepository,
      clock: new FixedClock(new Date('2026-03-01')),
    });

    const result = await useCase.execute(ctx, { limit: 20 });

    expect(result.items.map((a) => a.id).sort()).toEqual(['excluido', 'vencido']);
  });
});
