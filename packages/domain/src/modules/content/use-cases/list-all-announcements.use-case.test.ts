import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryAnnouncementRepository } from '../../../test/fakes';
import type { Announcement } from '../entities/announcement.entity';
import { ListAllAnnouncementsUseCase } from './list-all-announcements.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['announcement:read'],
};

const ctxSemPermissao: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: [],
};

function buildAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: 'aviso-1',
    tenantId: 't1',
    titulo: 'Aviso',
    descricao: 'Descrição do aviso',
    prioridade: 'baixa',
    publicado: false,
    destacar: false,
    dataPublicacao: null,
    dataExpiracao: null,
    requiresAcknowledgement: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'draft',
    ativo: true,
    ...overrides,
  };
}

describe('ListAllAnnouncementsUseCase', () => {
  it('lista todos os avisos do tenant, incluindo rascunhos', async () => {
    const announcementRepository = new InMemoryAnnouncementRepository();
    await announcementRepository.create(buildAnnouncement({ id: 'rascunho', publicado: false }));
    await announcementRepository.create(
      buildAnnouncement({ id: 'publicado', publicado: true, status: 'active' }),
    );
    const useCase = new ListAllAnnouncementsUseCase({ announcementRepository });

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(2);
  });

  it('lança ForbiddenError sem a permissão announcement:read', async () => {
    const announcementRepository = new InMemoryAnnouncementRepository();
    const useCase = new ListAllAnnouncementsUseCase({ announcementRepository });

    await expect(useCase.execute(ctxSemPermissao)).rejects.toThrow(ForbiddenError);
  });

  it('não retorna avisos de outro tenant', async () => {
    const announcementRepository = new InMemoryAnnouncementRepository();
    await announcementRepository.create(buildAnnouncement({ id: 'meu-tenant', tenantId: 't1' }));
    await announcementRepository.create(buildAnnouncement({ id: 'outro-tenant', tenantId: 't2' }));
    const useCase = new ListAllAnnouncementsUseCase({ announcementRepository });

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('meu-tenant');
  });
});
