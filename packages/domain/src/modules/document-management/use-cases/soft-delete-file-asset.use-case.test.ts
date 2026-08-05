import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryFileAssetRepository } from '../../../test/fakes';
import type { FileAsset } from '../entities/file-asset.entity';
import { SoftDeleteFileAssetUseCase } from './soft-delete-file-asset.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['file:delete'],
};

function buildFile(overrides: Partial<FileAsset> = {}): FileAsset {
  return {
    id: 'file-1',
    tenantId: 't1',
    titulo: 'Ata',
    descricao: null,
    categoriaId: 'cat-1',
    acervo: null,
    autor: null,
    tipo: 'pdf',
    urlArquivo: 'https://example.com/a.pdf',
    urlMiniatura: null,
    versao: 1,
    publicado: true,
    permitirDownload: true,
    contagemDownloads: 0,
    contagemVisualizacoes: 0,
    dataPublicacao: new Date('2026-01-01'),
    ordem: 0,
    tamanhoBytes: 1000,
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

function buildUseCase() {
  const fileAssetRepository = new InMemoryFileAssetRepository();
  const useCase = new SoftDeleteFileAssetUseCase({
    fileAssetRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, fileAssetRepository };
}

describe('SoftDeleteFileAssetUseCase', () => {
  it('marca deletedAt, status archived e ativo false, sem excluir fisicamente', async () => {
    const { useCase, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile());

    const result = await useCase.execute(ctx, 'file-1');

    expect(result.ok).toBe(true);

    const stored = await fileAssetRepository.findById('file-1');
    expect(stored).not.toBeNull();
    expect(stored?.deletedAt).toEqual(new Date('2026-06-01T00:00:00Z'));
    expect(stored?.status).toBe('archived');
    expect(stored?.ativo).toBe(false);
    expect(stored?.updatedBy).toBe('admin-1');
  });

  it('retorna NotFoundError quando o arquivo não existe', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('retorna NotFoundError quando o arquivo pertence a outro tenant', async () => {
    const { useCase, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile({ tenantId: 'outro-tenant' }));

    const result = await useCase.execute(ctx, 'file-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('lança ForbiddenError quando falta a permissão file:delete', async () => {
    const { useCase, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile());

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'file-1')).rejects.toThrow(
      ForbiddenError,
    );
  });
});
