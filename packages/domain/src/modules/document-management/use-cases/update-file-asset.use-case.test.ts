import { describe, expect, it } from 'vitest';
import type { FileAssetFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryFileAssetRepository } from '../../../test/fakes';
import type { FileAsset } from '../entities/file-asset.entity';
import { UpdateFileAssetUseCase } from './update-file-asset.use-case';

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

function buildInput(overrides: Partial<FileAssetFormValues> = {}): FileAssetFormValues {
  return {
    titulo: 'Ata revisada',
    descricao: null,
    categoriaId: 'cat-1',
    acervo: null,
    autor: null,
    tipo: 'pdf',
    urlArquivo: 'https://example.com/a.pdf',
    urlMiniatura: null,
    tamanhoBytes: 1000,
    permitirDownload: true,
    ordem: 0,
    ...overrides,
  };
}

function buildUseCase() {
  const fileAssetRepository = new InMemoryFileAssetRepository();
  const useCase = new UpdateFileAssetUseCase({
    fileAssetRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, fileAssetRepository };
}

describe('UpdateFileAssetUseCase', () => {
  it('atualiza os metadados sem incrementar a versão quando o arquivo não mudou', async () => {
    const { useCase, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile());

    const result = await useCase.execute(ctx, 'file-1', buildInput({ titulo: 'Ata revisada' }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.titulo).toBe('Ata revisada');
    expect(result.value.versao).toBe(1);
    expect(result.value.updatedAt).toEqual(new Date('2026-06-01T00:00:00Z'));
  });

  it('incrementa a versão quando urlArquivo muda (novo upload)', async () => {
    const { useCase, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile({ versao: 1 }));

    const result = await useCase.execute(
      ctx,
      'file-1',
      buildInput({ urlArquivo: 'https://example.com/nova-versao.pdf' }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.versao).toBe(2);
    expect(result.value.urlArquivo).toBe('https://example.com/nova-versao.pdf');
  });

  it('retorna NotFoundError quando o arquivo não existe', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'inexistente', buildInput());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('retorna NotFoundError quando o arquivo pertence a outro tenant', async () => {
    const { useCase, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile({ tenantId: 'outro-tenant' }));

    const result = await useCase.execute(ctx, 'file-1', buildInput());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('lança ForbiddenError quando falta a permissão file:update', async () => {
    const { useCase, fileAssetRepository } = buildUseCase();
    await fileAssetRepository.create(buildFile());

    await expect(
      useCase.execute({ ...ctx, permissions: [] }, 'file-1', buildInput()),
    ).rejects.toThrow(ForbiddenError);
  });
});
