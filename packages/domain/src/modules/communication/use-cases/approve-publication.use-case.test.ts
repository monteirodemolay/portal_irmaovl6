import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ConflictError } from '../../../shared/result';
import { FixedClock, InMemoryPublicationRepository } from '../../../test/fakes';
import type { Publication } from '../entities/publication.entity';
import { ApprovePublicationUseCase } from './approve-publication.use-case';

const ctx: AuthContext = {
  uid: 'chanceler-1',
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
    publicacaoStatus: 'awaiting_approval',
    approvedBy: null,
    approvedAt: null,
    publishedBy: null,
    publishedAt: null,
    assets: [
      {
        format: 'feed',
        url: 'https://blob.example.com/feed.png',
        mimeType: 'image/png',
        width: 1080,
        height: 1350,
        checksum: 'abc',
        generatedAt: new Date('2025-12-01'),
      },
    ],
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

describe('ApprovePublicationUseCase', () => {
  it('aprova publicação aguardando aprovação com ao menos uma arte', async () => {
    const publicationRepository = new InMemoryPublicationRepository();
    await publicationRepository.create(buildPublication());
    const useCase = new ApprovePublicationUseCase({
      publicationRepository,
      clock: new FixedClock(),
    });

    const result = await useCase.execute(ctx, 'pub-1');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.publicacaoStatus).toBe('ready');
      expect(result.value.approvedBy).toBe('chanceler-1');
    }
  });

  it('bloqueia aprovar rascunho sem nenhuma arte gerada', async () => {
    const publicationRepository = new InMemoryPublicationRepository();
    await publicationRepository.create(buildPublication({ publicacaoStatus: 'draft', assets: [] }));
    const useCase = new ApprovePublicationUseCase({
      publicationRepository,
      clock: new FixedClock(),
    });

    const result = await useCase.execute(ctx, 'pub-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(ConflictError);
  });

  it('bloqueia aprovar publicação já pronta', async () => {
    const publicationRepository = new InMemoryPublicationRepository();
    await publicationRepository.create(buildPublication({ publicacaoStatus: 'ready' }));
    const useCase = new ApprovePublicationUseCase({
      publicationRepository,
      clock: new FixedClock(),
    });

    const result = await useCase.execute(ctx, 'pub-1');

    expect(result.ok).toBe(false);
  });
});
