import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';

export interface RecordArchiveMediaViewDeps {
  archiveMediaRepository: IArchiveMediaRepository;
  archiveItemRepository: IArchiveItemRepository;
}

/**
 * Visualização de uma `ArchiveMedia` — Fase C "Administração & métricas",
 * chamada pelo proxy autenticado `/api/archive-media/[archiveMediaId]`
 * sempre que o binário principal (não a miniatura de vídeo) é servido.
 * Mesmo espírito de `RecordFileViewUseCase`/`RecordLibraryViewUseCase`
 * (Arquivos/Biblioteca legados) — sempre permitida a quem pode ler a mídia.
 *
 * Incrementa tanto `ArchiveMedia.contagemVisualizacoes` quanto
 * `ArchiveItem.contagemVisualizacoes` do item pai, num único caso de uso —
 * a seção "Mais visualizados" do Painel administrativo compara
 * `ArchiveItem`s entre si, então o item pai precisa acumular as
 * visualizações de todas as suas mídias.
 */
export class RecordArchiveMediaViewUseCase {
  constructor(private readonly deps: RecordArchiveMediaViewDeps) {}

  async execute(ctx: AuthContext, archiveMediaId: string): Promise<Result<void>> {
    requirePermission(ctx, 'archiveMedia:read');

    const media = await this.deps.archiveMediaRepository.findById(archiveMediaId);
    if (!media || media.tenantId !== ctx.tenantId || media.deletedAt) {
      return err(new NotFoundError('ArchiveMedia', archiveMediaId));
    }

    await this.deps.archiveMediaRepository.incrementViews(media.id);
    await this.deps.archiveItemRepository.incrementViews(media.archiveItemId);
    return ok(undefined);
  }
}
