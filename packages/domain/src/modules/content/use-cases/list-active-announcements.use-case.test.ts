import { describe, expect, it } from 'vitest';
import { InMemoryAnnouncementRepository } from '../../../test/fakes';
import type { Announcement } from '../entities/announcement.entity';
import { ListActiveAnnouncementsUseCase } from './list-active-announcements.use-case';

function buildAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: 'aviso-1',
    tenantId: 't1',
    titulo: 'Aviso',
    descricao: 'Descrição do aviso',
    prioridade: 'media',
    publicado: true,
    destacar: false,
    dataPublicacao: new Date('2026-01-01'),
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

describe('ListActiveAnnouncementsUseCase', () => {
  it('lista avisos publicados e não expirados, com destacados primeiro', async () => {
    const announcementRepository = new InMemoryAnnouncementRepository();
    await announcementRepository.create(buildAnnouncement({ id: 'aviso-1', destacar: false }));
    await announcementRepository.create(buildAnnouncement({ id: 'aviso-2', destacar: true }));
    const useCase = new ListActiveAnnouncementsUseCase({ announcementRepository });

    const result = await useCase.execute('t1');

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe('aviso-2');
  });

  it('exclui avisos não publicados e avisos expirados', async () => {
    const announcementRepository = new InMemoryAnnouncementRepository();
    await announcementRepository.create(buildAnnouncement({ id: 'rascunho', publicado: false }));
    await announcementRepository.create(
      buildAnnouncement({ id: 'expirado', dataExpiracao: new Date('2020-01-01') }),
    );
    await announcementRepository.create(buildAnnouncement({ id: 'ativo' }));
    const useCase = new ListActiveAnnouncementsUseCase({ announcementRepository });

    const result = await useCase.execute('t1');

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('ativo');
  });
});
