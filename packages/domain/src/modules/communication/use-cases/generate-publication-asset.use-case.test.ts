import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryPublicationRepository } from '../../../test/fakes';
import type { Publication } from '../entities/publication.entity';
import { GeneratePublicationAssetUseCase } from './generate-publication-asset.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['communication:manage'],
};

function buildPublication(overrides: Partial<Publication> = {}): Publication {
  return {
    id: 'pub-1',
    tenantId: 't1',
    templateId: 'template-1',
    sourceType: 'agenda_event',
    sourceId: 'event-1',
    title: 'Sessão Aprendiz',
    fields: {},
    caption: null,
    whatsappText: null,
    channels: [],
    scheduledFor: new Date('2026-01-05'),
    publicacaoStatus: 'draft',
    approvedBy: null,
    approvedAt: null,
    publishedBy: null,
    publishedAt: null,
    assets: [],
    createdAt: new Date('2025-12-01'),
    updatedAt: new Date('2025-12-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('GeneratePublicationAssetUseCase', () => {
  it('anexa o asset e move rascunho pra aguardando aprovação', async () => {
    const publicationRepository = new InMemoryPublicationRepository();
    await publicationRepository.create(buildPublication());
    const useCase = new GeneratePublicationAssetUseCase({
      publicationRepository,
      clock: new FixedClock(),
    });

    const result = await useCase.execute(ctx, 'pub-1', {
      format: 'feed',
      url: 'https://blob.example.com/pub-1/feed.png',
      width: 1080,
      height: 1350,
      checksum: 'abc123',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.publicacaoStatus).toBe('awaiting_approval');
      expect(result.value.assets).toHaveLength(1);
      expect(result.value.assets[0]?.format).toBe('feed');
    }
  });

  it('substitui o asset existente do mesmo formato em vez de duplicar', async () => {
    const publicationRepository = new InMemoryPublicationRepository();
    await publicationRepository.create(
      buildPublication({
        publicacaoStatus: 'awaiting_approval',
        assets: [
          {
            format: 'feed',
            url: 'https://blob.example.com/old.png',
            mimeType: 'image/png',
            width: 1080,
            height: 1350,
            checksum: 'old',
            generatedAt: new Date('2025-12-01'),
          },
        ],
      }),
    );
    const useCase = new GeneratePublicationAssetUseCase({
      publicationRepository,
      clock: new FixedClock(),
    });

    const result = await useCase.execute(ctx, 'pub-1', {
      format: 'feed',
      url: 'https://blob.example.com/new.png',
      width: 1080,
      height: 1350,
      checksum: 'new',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.assets).toHaveLength(1);
      expect(result.value.assets[0]?.checksum).toBe('new');
    }
  });
});
