import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IBoardTermRepository } from '../../governance/repositories/board-term.repository';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';
import type { IMediaAssetRepository } from '../repositories/media-asset.repository';

export interface StorageUsageByBoardTerm {
  boardTermId: string;
  boardTermNome: string;
  totalBytes: number;
  quantidadeArquivos: number;
}

export interface GetStorageUsageByBoardTermDeps {
  archiveMediaRepository: IArchiveMediaRepository;
  mediaAssetRepository: IMediaAssetRepository;
  boardTermRepository: IBoardTermRepository;
}

// Mesmo teto pragmático de `ListDuplicateMediaAssetsUseCase` — o acervo é
// pequeno o suficiente hoje para uma varredura completa em memória.
const SCAN_LIMIT = 5000;

/**
 * Soma `MediaAsset.size` agrupado por Gestão (`ArchiveMedia.boardTermId`) —
 * Fase C "Administração & métricas". Mídia sem Gestão identificável
 * (`boardTermId: null` — evento fora de qualquer período de Gestão
 * cadastrado) não entra em nenhum grupo, mesma regra que já vale para
 * `ArchiveItem.boardTermId` desde a Fase 1. Retorna todas as Gestões do
 * tenant, inclusive as sem nenhum arquivo (zero bytes), ordenadas da que
 * mais usa espaço para a que menos usa.
 *
 * Reaproveita `findByTenant`/`listByTenant` sem paginação real (mesmo teto
 * pragmático de `ListDuplicateMediaAssetsUseCase`) — agrupamento e soma
 * acontecem em memória aqui, sem método novo nos repositórios.
 */
export class GetStorageUsageByBoardTermUseCase {
  constructor(private readonly deps: GetStorageUsageByBoardTermDeps) {}

  async execute(ctx: AuthContext): Promise<StorageUsageByBoardTerm[]> {
    requirePermission(ctx, 'archiveMedia:manage');

    const [mediaPage, boardTerms] = await Promise.all([
      this.deps.archiveMediaRepository.findByTenant(ctx.tenantId, { limit: SCAN_LIMIT }),
      this.deps.boardTermRepository.listByTenant(ctx.tenantId),
    ]);

    const mediaByBoardTerm = new Map<string, string[]>();
    for (const media of mediaPage.items) {
      if (!media.boardTermId) continue;
      const list = mediaByBoardTerm.get(media.boardTermId) ?? [];
      list.push(media.mediaAssetId);
      mediaByBoardTerm.set(media.boardTermId, list);
    }

    const distinctAssetIds = [...new Set(mediaPage.items.map((media) => media.mediaAssetId))];
    const assets = await Promise.all(
      distinctAssetIds.map((id) => this.deps.mediaAssetRepository.findById(id)),
    );
    const sizeByAssetId = new Map<string, number>();
    for (const asset of assets) {
      if (asset) sizeByAssetId.set(asset.id, asset.size);
    }

    return boardTerms
      .filter((term) => !term.deletedAt)
      .map((term) => {
        const mediaAssetIds = mediaByBoardTerm.get(term.id) ?? [];
        const totalBytes = mediaAssetIds.reduce(
          (sum, assetId) => sum + (sizeByAssetId.get(assetId) ?? 0),
          0,
        );
        return {
          boardTermId: term.id,
          boardTermNome: term.nome,
          totalBytes,
          quantidadeArquivos: mediaAssetIds.length,
        };
      })
      .sort((a, b) => b.totalBytes - a.totalBytes);
  }
}
