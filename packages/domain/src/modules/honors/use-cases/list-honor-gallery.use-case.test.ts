import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import type { Honor } from '../entities/honor.entity';
import { InMemoryHonorRepository } from '../../../test/fakes';
import { ListHonorGalleryUseCase } from './list-honor-gallery.use-case';

const ctx: AuthContext = {
  uid: 'member-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['honor:read'],
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

describe('ListHonorGalleryUseCase', () => {
  it('lista as honrarias de todo o tenant (não só de um Irmão), mais recente primeiro', async () => {
    const honorRepository = new InMemoryHonorRepository();
    await honorRepository.create(buildHonor({ id: 'honor-1', data: new Date('2015-01-01') }));
    await honorRepository.create(
      buildHonor({ id: 'honor-2', memberId: 'member-2', data: new Date('2020-08-12') }),
    );
    await honorRepository.create(
      buildHonor({ id: 'honor-3', tenantId: 't2', memberId: 'member-3' }),
    );

    const useCase = new ListHonorGalleryUseCase({ honorRepository });
    const result = await useCase.execute(ctx);

    expect(result.map((h) => h.id)).toEqual(['honor-2', 'honor-1']);
  });

  it('lança ForbiddenError quando falta a permissão honor:read', async () => {
    const honorRepository = new InMemoryHonorRepository();
    const useCase = new ListHonorGalleryUseCase({ honorRepository });
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao)).rejects.toThrow(ForbiddenError);
  });
});
