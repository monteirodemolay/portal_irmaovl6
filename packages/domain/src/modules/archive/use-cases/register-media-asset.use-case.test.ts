import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryMediaAssetRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { RegisterMediaAssetUseCase } from './register-media-asset.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['mediaAsset:create'],
};

const input = {
  originalName: 'foto-sessao.jpg',
  normalizedName: 'foto-sessao.jpg',
  mimeType: 'image/jpeg',
  extension: 'jpg',
  size: 123456,
  sha256: 'a'.repeat(64),
  provider: 'vercel_blob' as const,
  storageKey: 'archive/foto-sessao.jpg',
  width: 1920,
  height: 1080,
  duration: null,
};

function buildUseCase() {
  const mediaAssetRepository = new InMemoryMediaAssetRepository();
  const useCase = new RegisterMediaAssetUseCase({
    mediaAssetRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, mediaAssetRepository };
}

describe('RegisterMediaAssetUseCase', () => {
  it('cria o MediaAsset com processingStatus pendente e sem duplicata', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.mediaAsset.processingStatus).toBe('pendente');
    expect(result.value.possivelDuplicata).toBeNull();
  });

  it('avisa (não bloqueia) quando já existe outro MediaAsset com o mesmo sha256 no tenant', async () => {
    const { useCase, mediaAssetRepository } = buildUseCase();
    await useCase.execute(ctx, input);

    const result = await useCase.execute(ctx, { ...input, originalName: 'copia.jpg' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.possivelDuplicata).not.toBeNull();
    expect(result.value.possivelDuplicata?.sha256).toBe(input.sha256);

    const all = await mediaAssetRepository.findByTenant('t1', { limit: 10 });
    expect(all.items).toHaveLength(2);
  });

  it('não considera duplicata um sha256 igual em outro tenant', async () => {
    const { useCase } = buildUseCase();
    await useCase.execute({ ...ctx, tenantId: 't2' }, input);

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.possivelDuplicata).toBeNull();
  });

  it('lança ForbiddenError quando falta a permissão mediaAsset:create', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute({ ...ctx, permissions: [] }, input)).rejects.toThrow(
      ForbiddenError,
    );
  });
});
