import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ValidationError, ok, err, type Result } from '../../../shared/result';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';

export interface PublishArchiveItemDeps {
  archiveItemRepository: IArchiveItemRepository;
  archiveMediaRepository: IArchiveMediaRepository;
  clock: IClock;
}

/**
 * Uma pendência que bloqueia (ou não) a publicação definitiva de um
 * `ArchiveItem` — mesmo vocabulário usado pelo checklist de publicação do
 * passo "Organizar / Publicar" no client (Fase 3,
 * docs/architecture/11-acervo-vl6.md §11.6), para nunca duplicar a regra de
 * negócio: o client só chama `getArchiveItemPublicationBlockers` para
 * exibir o checklist, a mesma função que `PublishArchiveItemUseCase` usa
 * para decidir se bloqueia de verdade.
 */
export type ArchiveItemPublicationBlocker = 'sem_gestao' | 'sem_capa' | 'legendas_pendentes';

export const ARCHIVE_ITEM_PUBLICATION_BLOCKER_LABELS: Record<
  ArchiveItemPublicationBlocker,
  string
> = {
  sem_gestao: 'Nenhuma Gestão foi identificada para a data do evento vinculado.',
  sem_capa: 'Há fotografias no item, mas nenhuma foi marcada como capa.',
  legendas_pendentes: 'Uma ou mais mídias ainda não têm legenda preenchida.',
};

/**
 * Decisão explícita do Administrador: nenhum campo (Gestão, capa,
 * legenda) trava a publicação — o registro do acontecimento precisa
 * fluir mesmo incompleto, com esses dados completados depois. Antes
 * disso, gestão/capa/legenda ausentes eram bloqueadas aqui; a função
 * (e o tipo `ArchiveItemPublicationBlocker`) continuam existindo só
 * pra não obrigar reescrever o checklist visual do passo "Revisão" e
 * `PublishArchiveItemUseCase`/`ScheduleArchiveItemPublicationUseCase`,
 * que já consultam este ponto único — sempre "sem pendências" agora.
 */
export function getArchiveItemPublicationBlockers(
  _item: Pick<ArchiveItem, 'boardTermId'>,
  _medias: Pick<ArchiveMedia, 'mediaType' | 'isCover' | 'caption'>[],
): ArchiveItemPublicationBlocker[] {
  return [];
}

/**
 * Transiciona um `ArchiveItem` (e todas as suas `ArchiveMedia` não
 * excluídas) para `publicado` — passo final do wizard "Organizar /
 * Publicar" (Fase 3). Bloqueia com `ValidationError` (nunca lança exceção
 * de negócio) quando `getArchiveItemPublicationBlockers` encontra qualquer
 * pendência, ou quando o item já não está mais num estado publicável
 * (`rascunho`/`pronto_para_publicar`).
 */
export class PublishArchiveItemUseCase {
  constructor(private readonly deps: PublishArchiveItemDeps) {}

  async execute(ctx: AuthContext, archiveItemId: string): Promise<Result<ArchiveItem>> {
    requirePermission(ctx, 'archiveItem:publish');

    const item = await this.deps.archiveItemRepository.findById(archiveItemId);
    if (!item || item.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveItem', archiveItemId));
    }

    if (item.publicacaoStatus !== 'rascunho' && item.publicacaoStatus !== 'pronto_para_publicar') {
      return err(
        new ValidationError(
          `Item no estado "${item.publicacaoStatus}" não pode ser publicado a partir daqui.`,
        ),
      );
    }

    const medias = await this.deps.archiveMediaRepository.findByArchiveItemId(archiveItemId);
    const blockers = getArchiveItemPublicationBlockers(item, medias);
    if (blockers.length > 0) {
      return err(
        new ValidationError(
          `Publicação bloqueada: ${blockers
            .map((blocker) => ARCHIVE_ITEM_PUBLICATION_BLOCKER_LABELS[blocker])
            .join(' ')}`,
        ),
      );
    }

    const now = this.deps.clock.now();
    await Promise.all(
      medias.map((media) =>
        this.deps.archiveMediaRepository.update({
          ...media,
          publicacaoStatus: 'publicado',
          updatedAt: now,
          updatedBy: ctx.uid,
        }),
      ),
    );

    const updatedItem: ArchiveItem = {
      ...item,
      publicacaoStatus: 'publicado',
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.archiveItemRepository.update(updatedItem);

    return ok(updatedItem);
  }
}
