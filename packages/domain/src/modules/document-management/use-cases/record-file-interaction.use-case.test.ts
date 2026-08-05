import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import type { FileAsset } from '../entities/file-asset.entity';
import type { IFileAssetRepository } from '../repositories/file-asset.repository';
import { RecordFileDownloadUseCase } from './record-file-interaction.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: ['file:read'] };

function buildFile(overrides: Partial<FileAsset>): FileAsset {
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
    createdBy: 'u1',
    updatedBy: 'u1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

class FakeFileAssetRepository implements Partial<IFileAssetRepository> {
  constructor(private readonly file: FileAsset) {}
  incrementCalls = 0;
  async findById() {
    return this.file;
  }
  async incrementDownloads() {
    this.incrementCalls += 1;
  }
}

describe('RecordFileDownloadUseCase', () => {
  it('bloqueia o download quando permitirDownload é false', async () => {
    const repo = new FakeFileAssetRepository(buildFile({ permitirDownload: false }));
    const useCase = new RecordFileDownloadUseCase({
      fileAssetRepository: repo as unknown as IFileAssetRepository,
    });

    const result = await useCase.execute(ctx, 'file-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('forbidden');
    expect(repo.incrementCalls).toBe(0);
  });

  it('incrementa o contador quando o download é permitido', async () => {
    const repo = new FakeFileAssetRepository(buildFile({ permitirDownload: true }));
    const useCase = new RecordFileDownloadUseCase({
      fileAssetRepository: repo as unknown as IFileAssetRepository,
    });

    const result = await useCase.execute(ctx, 'file-1');

    expect(result.ok).toBe(true);
    expect(repo.incrementCalls).toBe(1);
  });
});
