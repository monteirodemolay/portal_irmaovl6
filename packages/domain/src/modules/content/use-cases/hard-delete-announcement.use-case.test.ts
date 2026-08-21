import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryAnnouncementRepository } from '../../../test/fakes';
import type { Announcement } from '../entities/announcement.entity';
import { HardDeleteAnnouncementUseCase } from './hard-delete-announcement.use-case';

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
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: new Date('2026-02-01'),
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('HardDeleteAnnouncementUseCase', () => {
  it('remove o documento de vez', async () => {
    const announcementRepository = new InMemoryAnnouncementRepository();
    await announcementRepository.create(buildAnnouncement());
    const useCase = new HardDeleteAnnouncementUseCase({ announcementRepository });

    const result = await useCase.execute(ctx, 'aviso-1');

    expect(result.ok).toBe(true);
    expect(await announcementRepository.findById('aviso-1')).toBeNull();
  });
});
