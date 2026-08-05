import { describe, expect, it } from 'vitest';
import type { FileAssetFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryFileAssetRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateFileAssetUseCase } from './create-file-asset.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['file:create'],
};

const input: FileAssetFormValues = {
  titulo: 'Ata de Reunião',
  descricao: null,
  categoriaId: 'cat-1',
  acervo: null,
  autor: null,
  tipo: 'pdf',
  urlArquivo: 'https://example.com/ata.pdf',
  urlMiniatura: null,
  tamanhoBytes: 2048,
  permitirDownload: true,
  ordem: 0,
};

function buildUseCase() {
  const fileAssetRepository = new InMemoryFileAssetRepository();
  const useCase = new CreateFileAssetUseCase({
    fileAssetRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, fileAssetRepository };
}

describe('CreateFileAssetUseCase', () => {
  it('cria o arquivo como rascunho não publicado', async () => {
    const { useCase, fileAssetRepository } = buildUseCase();

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.publicado).toBe(false);
    expect(result.value.status).toBe('draft');
    expect(result.value.versao).toBe(1);
    expect(result.value.dataPublicacao).toBeNull();
    expect(result.value.contagemDownloads).toBe(0);
    expect(result.value.contagemVisualizacoes).toBe(0);
    expect(result.value.tenantId).toBe('t1');

    const stored = await fileAssetRepository.findById(result.value.id);
    expect(stored).not.toBeNull();
  });

  it('lança ForbiddenError quando falta a permissão file:create', async () => {
    const { useCase } = buildUseCase();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, input)).rejects.toThrow(ForbiddenError);
  });
});
