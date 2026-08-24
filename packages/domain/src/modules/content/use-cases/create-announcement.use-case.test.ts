import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryAnnouncementRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateAnnouncementUseCase } from './create-announcement.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['announcement:manage'],
};

const baseInput = {
  descricao: 'Descrição do aviso',
  prioridade: 'alta' as const,
  destacar: true,
  dataExpiracao: null,
  requiresAcknowledgement: false,
};

describe('CreateAnnouncementUseCase', () => {
  it('permite até 3 avisos destacados simultâneos', async () => {
    const announcementRepository = new InMemoryAnnouncementRepository();
    const useCase = new CreateAnnouncementUseCase({
      announcementRepository,
      clock: new FixedClock(),
      idGenerator: new SequentialIdGenerator(),
    });

    await useCase.execute(ctx, { ...baseInput, titulo: 'Aviso 1' });
    await useCase.execute(ctx, { ...baseInput, titulo: 'Aviso 2' });
    await useCase.execute(ctx, { ...baseInput, titulo: 'Aviso 3' });

    const highlighted = await announcementRepository.listHighlighted('t1');
    expect(highlighted).toHaveLength(3);
  });

  it('desmarca o destaque mais antigo ao criar o 4º aviso destacado', async () => {
    const announcementRepository = new InMemoryAnnouncementRepository();
    const useCase = new CreateAnnouncementUseCase({
      announcementRepository,
      clock: new FixedClock(),
      idGenerator: new SequentialIdGenerator(),
    });

    await useCase.execute(ctx, { ...baseInput, titulo: 'Aviso 1' });
    await useCase.execute(ctx, { ...baseInput, titulo: 'Aviso 2' });
    await useCase.execute(ctx, { ...baseInput, titulo: 'Aviso 3' });
    const fourth = await useCase.execute(ctx, { ...baseInput, titulo: 'Aviso 4' });

    expect(fourth.ok).toBe(true);

    const highlighted = await announcementRepository.listHighlighted('t1');
    expect(highlighted).toHaveLength(3);
    expect(highlighted.some((a) => a.titulo === 'Aviso 1')).toBe(false);
    expect(highlighted.some((a) => a.titulo === 'Aviso 4')).toBe(true);
  });
});
