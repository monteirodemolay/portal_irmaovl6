import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ValidationError, ok, err, type Result } from '../../../shared/result';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';
import {
  ARCHIVE_ITEM_PUBLICATION_BLOCKER_LABELS,
  getArchiveItemPublicationBlockers,
} from './publish-archive-item.use-case';

export interface ScheduleArchiveItemPublicationDeps {
  archiveItemRepository: IArchiveItemRepository;
  archiveMediaRepository: IArchiveMediaRepository;
  clock: IClock;
}

/**
 * Agenda (ou cancela) a publicação automática de um `ArchiveItem` — Fase B
 * "Publicação avançada". Grava `publicarEm` sem transicionar
 * `publicacaoStatus` para `publicado` (isso só acontece de fato quando
 * `PublishScheduledArchiveItemsUseCase` roda, via Vercel Cron); o item
 * permanece `pronto_para_publicar` até lá, exatamente como o botão
 * "Publicar agora" (`PublishArchiveItemUseCase`) já exige.
 *
 * `publicarEm: null` cancela o agendamento — sempre permitido,
 * independentemente de pendências, porque só limpa o campo. `publicarEm`
 * futuro exige as MESMAS pendências zeradas que a publicação imediata
 * (`getArchiveItemPublicationBlockers`, nunca duplicada) e uma data
 * estritamente no futuro em relação ao relógio do servidor.
 */
export class ScheduleArchiveItemPublicationUseCase {
  constructor(private readonly deps: ScheduleArchiveItemPublicationDeps) {}

  async execute(
    ctx: AuthContext,
    archiveItemId: string,
    publicarEm: Date | null,
  ): Promise<Result<ArchiveItem>> {
    requirePermission(ctx, 'archiveItem:publish');

    const item = await this.deps.archiveItemRepository.findById(archiveItemId);
    if (!item || item.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveItem', archiveItemId));
    }

    const now = this.deps.clock.now();

    if (publicarEm === null) {
      const updatedItem: ArchiveItem = {
        ...item,
        publicarEm: null,
        updatedAt: now,
        updatedBy: ctx.uid,
      };
      await this.deps.archiveItemRepository.update(updatedItem);
      return ok(updatedItem);
    }

    if (item.publicacaoStatus !== 'rascunho' && item.publicacaoStatus !== 'pronto_para_publicar') {
      return err(
        new ValidationError(
          `Item no estado "${item.publicacaoStatus}" não pode ser agendado a partir daqui.`,
        ),
      );
    }

    if (publicarEm.getTime() <= now.getTime()) {
      return err(new ValidationError('A data de agendamento precisa estar no futuro.'));
    }

    const medias = await this.deps.archiveMediaRepository.findByArchiveItemId(archiveItemId);
    const blockers = getArchiveItemPublicationBlockers(item, medias);
    if (blockers.length > 0) {
      return err(
        new ValidationError(
          `Agendamento bloqueado: ${blockers
            .map((blocker) => ARCHIVE_ITEM_PUBLICATION_BLOCKER_LABELS[blocker])
            .join(' ')}`,
        ),
      );
    }

    const updatedItem: ArchiveItem = {
      ...item,
      publicacaoStatus: 'pronto_para_publicar',
      publicarEm,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.archiveItemRepository.update(updatedItem);

    return ok(updatedItem);
  }
}
