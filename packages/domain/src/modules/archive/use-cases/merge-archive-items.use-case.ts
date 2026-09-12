import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ValidationError, err, ok, type Result } from '../../../shared/result';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';

export interface MergeArchiveItemsDeps {
  archiveItemRepository: IArchiveItemRepository;
  archiveMediaRepository: IArchiveMediaRepository;
  clock: IClock;
}

export interface MergeArchiveItemsReport {
  canonicalArchiveItemId: string;
  itensMesclados: number;
  midiasReatribuidas: number;
}

/**
 * Mescla `ArchiveItem`s duplicados (ex.: um por Irmão, criados antes da
 * unificação por sessão em `CreateInitiationArchiveItemUseCase`) num só
 * item canônico, escolhido pelo Administrador. Mesmo espírito de
 * `MergeDuplicateMembersUseCase`: nunca apaga histórico — funde os
 * `origemIniciacaoMemberIds`/`origemElevacaoMemberIds`/`origemExaltacaoMemberIds`
 * dos duplicados no canônico, reatribui toda `ArchiveMedia` das duplicatas
 * pro item canônico, e só então arquiva (soft delete) os duplicados. Exige
 * que canônico e duplicatas sejam do mesmo `tipo` — um item de Iniciação
 * nunca é mesclado com um de Elevação, mesmo que compartilhem `eventId`.
 */
export class MergeArchiveItemsUseCase {
  constructor(private readonly deps: MergeArchiveItemsDeps) {}

  async execute(
    ctx: AuthContext,
    canonicalArchiveItemId: string,
    duplicateArchiveItemIds: string[],
  ): Promise<Result<MergeArchiveItemsReport>> {
    requirePermission(ctx, 'archiveItem:delete');

    const uniqueDuplicateIds = Array.from(new Set(duplicateArchiveItemIds)).filter(
      (id) => id !== canonicalArchiveItemId,
    );
    if (uniqueDuplicateIds.length === 0) {
      return err(new ValidationError('Selecione ao menos um rascunho duplicado para mesclar.'));
    }

    const canonical = await this.deps.archiveItemRepository.findById(canonicalArchiveItemId);
    if (!canonical || canonical.tenantId !== ctx.tenantId || canonical.deletedAt) {
      return err(new NotFoundError('ArchiveItem', canonicalArchiveItemId));
    }

    let mergedOrigemIniciacao = canonical.origemIniciacaoMemberIds ?? [];
    let mergedOrigemElevacao = canonical.origemElevacaoMemberIds ?? [];
    let mergedOrigemExaltacao = canonical.origemExaltacaoMemberIds ?? [];
    let itensMesclados = 0;
    let midiasReatribuidas = 0;
    const now = this.deps.clock.now();

    for (const duplicateId of uniqueDuplicateIds) {
      const duplicate = await this.deps.archiveItemRepository.findById(duplicateId);
      if (
        !duplicate ||
        duplicate.tenantId !== ctx.tenantId ||
        duplicate.deletedAt ||
        duplicate.tipo !== canonical.tipo
      ) {
        continue;
      }

      mergedOrigemIniciacao = Array.from(
        new Set([...mergedOrigemIniciacao, ...(duplicate.origemIniciacaoMemberIds ?? [])]),
      );
      mergedOrigemElevacao = Array.from(
        new Set([...mergedOrigemElevacao, ...(duplicate.origemElevacaoMemberIds ?? [])]),
      );
      mergedOrigemExaltacao = Array.from(
        new Set([...mergedOrigemExaltacao, ...(duplicate.origemExaltacaoMemberIds ?? [])]),
      );

      const medias = await this.deps.archiveMediaRepository.findByArchiveItemId(duplicateId);
      for (const media of medias) {
        await this.deps.archiveMediaRepository.update({
          ...media,
          archiveItemId: canonicalArchiveItemId,
          isCover: false,
          updatedAt: now,
          updatedBy: ctx.uid,
        });
        midiasReatribuidas += 1;
      }

      await this.deps.archiveItemRepository.softDelete(duplicateId, now, ctx.uid);
      itensMesclados += 1;
    }

    if (itensMesclados > 0) {
      await this.deps.archiveItemRepository.update({
        ...canonical,
        origemIniciacaoMemberIds: mergedOrigemIniciacao,
        origemElevacaoMemberIds: mergedOrigemElevacao,
        origemExaltacaoMemberIds: mergedOrigemExaltacao,
        updatedAt: now,
        updatedBy: ctx.uid,
      });
    }

    return ok({ canonicalArchiveItemId, itensMesclados, midiasReatribuidas });
  }
}
