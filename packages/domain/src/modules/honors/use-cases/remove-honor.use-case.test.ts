import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import type { Honor } from '../entities/honor.entity';
import { FixedClock, InMemoryHonorRepository } from '../../../test/fakes';
import { RemoveHonorUseCase } from './remove-honor.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['honor:manage'],
};

function buildHonor(overrides: Partial<Honor> = {}): Honor {
  return {
    id: 'honor-1',
    tenantId: 't1',
    memberId: 'member-1',
    homenageadoNome: null,
    homenageadoLojaOrigem: null,
    homenageadoOriente: null,
    nomeOficial: 'Comenda do Mérito Maçônico',
    tipo: 'comenda',
    instituicaoConcedente: 'Grande Loja Maçônica',
    data: new Date('2020-08-12'),
    numeroAto: null,
    motivo: null,
    descricaoHistorica: null,
    diplomaFileId: null,
    fotoEntregaFileId: null,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const honorRepository = new InMemoryHonorRepository();
  const useCase = new RemoveHonorUseCase({
    honorRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
  });
  return { useCase, honorRepository };
}

describe('RemoveHonorUseCase', () => {
  it('marca a honraria como excluída (soft delete)', async () => {
    const { useCase, honorRepository } = buildUseCase();
    await honorRepository.create(buildHonor());

    const result = await useCase.execute(ctx, 'honor-1');

    expect(result.ok).toBe(true);
    const stored = await honorRepository.findById('honor-1');
    expect(stored?.deletedAt).not.toBeNull();
  });

  it('devolve NotFoundError quando a honraria não existe', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta a permissão honor:manage', async () => {
    const { useCase } = buildUseCase();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, 'honor-1')).rejects.toThrow(ForbiddenError);
  });
});
