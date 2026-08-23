import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ValidationError, ok, err, type Result } from '../../../shared/result';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';

export interface SetArchiveMediaPosterDeps {
  archiveMediaRepository: IArchiveMediaRepository;
  clock: IClock;
}

/**
 * Associa (ou remove) a miniatura de vídeo capturada no browser
 * (`posterMediaAssetId`) a uma `ArchiveMedia` — Fase B "Publicação
 * avançada", item "Miniatura automática de vídeo". O binário da miniatura
 * já foi registrado como um `MediaAsset` comum (mesmo fluxo de
 * `RegisterMediaAssetUseCase` usado para o vídeo original) antes de chamar
 * este caso de uso; aqui só se grava o vínculo.
 *
 * Restrito a `mediaType: 'video'` — miniatura não faz sentido para
 * foto/áudio/documento. Falha de captura no client nunca chega até aqui
 * (o upload do vídeo principal segue normalmente mesmo sem miniatura).
 */
export class SetArchiveMediaPosterUseCase {
  constructor(private readonly deps: SetArchiveMediaPosterDeps) {}

  async execute(
    ctx: AuthContext,
    archiveMediaId: string,
    posterMediaAssetId: string | null,
  ): Promise<Result<ArchiveMedia>> {
    requirePermission(ctx, 'archiveMedia:update');

    const media = await this.deps.archiveMediaRepository.findById(archiveMediaId);
    if (!media || media.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('ArchiveMedia', archiveMediaId));
    }

    if (media.mediaType !== 'video') {
      return err(new ValidationError('Só vídeos podem ter uma miniatura associada.'));
    }

    const updatedMedia: ArchiveMedia = {
      ...media,
      posterMediaAssetId,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.archiveMediaRepository.update(updatedMedia);

    return ok(updatedMedia);
  }
}
