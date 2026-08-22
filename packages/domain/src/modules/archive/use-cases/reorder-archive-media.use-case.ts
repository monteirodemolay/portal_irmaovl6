import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ValidationError, ok, err, type Result } from '../../../shared/result';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';

export interface ReorderArchiveMediaDeps {
  archiveItemRepository: IArchiveItemRepository;
  archiveMediaRepository: IArchiveMediaRepository;
  clock: IClock;
}

/**
 * Reordena as `ArchiveMedia` de um `ArchiveItem` — aba "Fotografias" do
 * passo "Organizar / Publicar" (Fase 3, docs/architecture/11-acervo-vl6.md
 * §11.6). Recebe a lista completa de `archiveMediaId` já na ordem final
 * (drag-and-drop nativo no client) e persiste `order` sequencial (0, 1,
 * 2…) em cada mídia. Exige que a lista informada contenha exatamente as
 * mesmas mídias não excluídas do item — nem a mais, nem a menos — para
 * nunca reordenar "no escuro" um item que mudou entre o carregamento da
 * tela e o drop.
 */
export class ReorderArchiveMediaUseCase {
  constructor(private readonly deps: ReorderArchiveMediaDeps) {}

  async execute(
    ctx: AuthContext,
    archiveItemId: string,
    orderedArchiveMediaIds: string[],
  ): Promise<Result<ArchiveMedia[]>> {
    requirePermission(ctx, 'archiveMedia:update');

    const item = await this.deps.archiveItemRepository.findById(archiveItemId);
    if (!item || item.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveItem', archiveItemId));
    }

    const siblings = await this.deps.archiveMediaRepository.findByArchiveItemId(archiveItemId);
    const siblingIds = new Set(siblings.map((media) => media.id));

    if (
      orderedArchiveMediaIds.length !== siblings.length ||
      new Set(orderedArchiveMediaIds).size !== orderedArchiveMediaIds.length ||
      orderedArchiveMediaIds.some((id) => !siblingIds.has(id))
    ) {
      return err(
        new ValidationError(
          'A lista de mídias informada não corresponde às mídias atuais do item.',
        ),
      );
    }

    const byId = new Map(siblings.map((media) => [media.id, media]));
    const now = this.deps.clock.now();
    const updated = orderedArchiveMediaIds.map((id, index) => ({
      ...byId.get(id)!,
      order: index,
      updatedAt: now,
      updatedBy: ctx.uid,
    }));

    await Promise.all(updated.map((media) => this.deps.archiveMediaRepository.update(media)));

    return ok(updated);
  }
}
