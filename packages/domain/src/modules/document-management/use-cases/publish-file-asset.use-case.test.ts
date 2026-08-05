import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryFileAssetRepository } from '../../../test/fakes';
import type { FileAsset } from '../entities/file-asset.entity';
import { PublishFileAssetUseCase } from './publish-file-asset.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['file:update'],
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
    publicado: false,
    permitirDownload: true,
    contagemDownloads: 0,
    contagemVisualizacoes: 0,
    dataPublicacao: null,
    ordem: 0,
    tamanhoBytes: 1000,
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
  const fileAssetRepository = new InMemoryFileAssetRepository();
  const useCase = new PublishFileAssetUseCase({
    fileAssetRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, fileAssetRepository };
}

describe('PublishFileAssetUseCase', () => {
  it('publica o arquivo definindo dataPublicacao e status active', async () => {
    const { useCase, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile());

    const result = await useCase.execute(ctx, 'file-1', true);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicado).toBe(true);
    expect(result.value.status).toBe('active');
    expect(result.value.dataPublicacao).toEqual(new Date('2026-06-01T00:00:00Z'));
  });

  it('não sobrescreve dataPublicacao ao republicar um arquivo já publicado antes', async () => {
    const { useCase, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(
      buildFile({ publicado: true, dataPublicacao: new Date('2026-01-01T00:00:00Z') }),
    );

    const result = await useCase.execute(ctx, 'file-1', true);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.dataPublicacao).toEqual(new Date('2026-01-01T00:00:00Z'));
  });

  it('despublica o arquivo voltando o status para draft', async () => {
    const { useCase, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(
      buildFile({ publicado: true, status: 'active', dataPublicacao: new Date('2026-01-01') }),
    );

    const result = await useCase.execute(ctx, 'file-1', false);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicado).toBe(false);
    expect(result.value.status).toBe('draft');
    expect(result.value.dataPublicacao).toEqual(new Date('2026-01-01'));
  });

  it('retorna NotFoundError quando o arquivo não existe', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'inexistente', true);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('retorna NotFoundError quando o arquivo pertence a outro tenant', async () => {
    const { useCase, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile({ tenantId: 'outro-tenant' }));

    const result = await useCase.execute(ctx, 'file-1', true);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('lança ForbiddenError quando falta a permissão file:update', async () => {
    const { useCase, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile());

    await expect(useCase.execute({ ...ctx, permissions: [] }, 'file-1', true)).rejects.toThrow(
      ForbiddenError,
    );
  });
});
