import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryArchiveContributionRepository } from '../../../test/fakes';
import type { ArchiveContribution } from '../entities/archive-contribution.entity';
import { ModerateArchiveContributionUseCase } from './moderate-archive-contribution.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveContribution:manage'],
};

function makeContribution(overrides: Partial<ArchiveContribution> = {}): ArchiveContribution {
  return {
    id: 'contrib-1',
    tenantId: 't1',
    memberId: 'member-1',
    titulo: 'Título',
    descricao: 'Descrição',
    tipo: 'memoria',
    arquivoUrl: null,
    tamanhoBytes: null,
    moderacaoStatus: 'pendente',
    motivoRejeicao: null,
    moderadoPor: null,
    moderadoEm: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'user-1',
    updatedBy: 'user-1',
    deletedAt: null,
    status: 'draft',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const archiveContributionRepository = new InMemoryArchiveContributionRepository();
  const useCase = new ModerateArchiveContributionUseCase({
    archiveContributionRepository,
    clock: new FixedClock(new Date('2026-02-01T00:00:00Z')),
  });
  return { useCase, archiveContributionRepository };
}

describe('ModerateArchiveContributionUseCase', () => {
  it('aprova a contribuição', async () => {
    const { useCase, archiveContributionRepository } = buildUseCase();
    await archiveContributionRepository.create(makeContribution());

    const result = await useCase.execute(ctx, 'contrib-1', true, null);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.moderacaoStatus).toBe('aprovada');
    expect(result.value.motivoRejeicao).toBeNull();
    expect(result.value.moderadoPor).toBe('admin-1');
    expect(result.value.moderadoEm).toEqual(new Date('2026-02-01T00:00:00Z'));
  });

  it('rejeita a contribuição com motivo, sem soft-delete', async () => {
    const { useCase, archiveContributionRepository } = buildUseCase();
    await archiveContributionRepository.create(makeContribution());

    const result = await useCase.execute(ctx, 'contrib-1', false, 'Sem procedência clara.');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.moderacaoStatus).toBe('rejeitada');
    expect(result.value.motivoRejeicao).toBe('Sem procedência clara.');
    expect(result.value.deletedAt).toBeNull();
    expect(result.value.ativo).toBe(true);
  });

  it('retorna NotFoundError para contribuição inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'ghost', true, null);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
