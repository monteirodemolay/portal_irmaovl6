import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryAnnouncementRepository } from '../../../test/fakes';
import type { Announcement } from '../entities/announcement.entity';
import { PublishAnnouncementUseCase } from './publish-announcement.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['announcement:publish'],
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
    prioridade: 'media',
    publicado: false,
    destacar: false,
    dataPublicacao: null,
    dataExpiracao: null,
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

function buildUseCase() {
  const announcementRepository = new InMemoryAnnouncementRepository();
  const useCase = new PublishAnnouncementUseCase({
    announcementRepository,
    clock: new FixedClock(new Date('2026-03-01T00:00:00Z')),
  });
  return { useCase, announcementRepository };
}

describe('PublishAnnouncementUseCase', () => {
  it('publica o aviso, define dataPublicacao e status active', async () => {
    const { useCase, announcementRepository } = buildUseCase();
    await announcementRepository.create(buildAnnouncement());

    const result = await useCase.execute(ctx, 'aviso-1', true);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicado).toBe(true);
    expect(result.value.dataPublicacao).toEqual(new Date('2026-03-01T00:00:00Z'));
    expect(result.value.status).toBe('active');
  });

  it('lança ForbiddenError sem a permissão announcement:publish', async () => {
    const { useCase, announcementRepository } = buildUseCase();
    await announcementRepository.create(buildAnnouncement());

    await expect(useCase.execute(ctxSemPermissao, 'aviso-1', true)).rejects.toThrow(ForbiddenError);
  });

  it('retorna NotFoundError quando o aviso não existe no tenant', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'inexistente', true);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('ao despublicar, mantém a dataPublicacao original e volta status para draft', async () => {
    const { useCase, announcementRepository } = buildUseCase();
    await announcementRepository.create(
      buildAnnouncement({
        publicado: true,
        dataPublicacao: new Date('2026-01-15T00:00:00Z'),
        status: 'active',
      }),
    );

    const result = await useCase.execute(ctx, 'aviso-1', false);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicado).toBe(false);
    expect(result.value.dataPublicacao).toEqual(new Date('2026-01-15T00:00:00Z'));
    expect(result.value.status).toBe('draft');
  });
});
