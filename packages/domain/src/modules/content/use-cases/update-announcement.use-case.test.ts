import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryAnnouncementRepository } from '../../../test/fakes';
import type { Announcement } from '../entities/announcement.entity';
import { UpdateAnnouncementUseCase } from './update-announcement.use-case';

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
    titulo: 'Original',
    descricao: 'Descrição original',
    prioridade: 'media',
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

describe('UpdateAnnouncementUseCase', () => {
  it('atualiza os campos editáveis do aviso', async () => {
    const announcementRepository = new InMemoryAnnouncementRepository();
    await announcementRepository.create(buildAnnouncement());
    const useCase = new UpdateAnnouncementUseCase({
      announcementRepository,
      clock: new FixedClock(new Date('2026-03-01')),
    });

    const result = await useCase.execute(ctx, 'aviso-1', {
      titulo: 'Novo título',
      descricao: 'Nova descrição',
      prioridade: 'alta',
      destacar: true,
      dataExpiracao: null,
      requiresAcknowledgement: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.titulo).toBe('Novo título');
    expect(result.value.prioridade).toBe('alta');
  });

  it('retorna NotFoundError quando o aviso não existe no tenant', async () => {
    const announcementRepository = new InMemoryAnnouncementRepository();
    const useCase = new UpdateAnnouncementUseCase({
      announcementRepository,
      clock: new FixedClock(),
    });

    const result = await useCase.execute(ctx, 'inexistente', {
      titulo: 'x',
      descricao: 'y',
      prioridade: 'baixa',
      destacar: false,
      dataExpiracao: null,
      requiresAcknowledgement: false,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
