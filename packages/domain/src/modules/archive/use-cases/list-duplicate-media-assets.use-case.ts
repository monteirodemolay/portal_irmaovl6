import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import type { MediaAsset } from '../entities/media-asset.entity';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';
import type { IMediaAssetRepository } from '../repositories/media-asset.repository';

export interface DuplicateMediaAssetGroup {
  sha256: string;
  /** Todos os `MediaAsset` do tenant com este hash — 2 ou mais, sempre. */
  mediaAssets: MediaAsset[];
  /** `ArchiveMedia` (não excluídas) que apontam para cada `MediaAsset` do grupo, indexadas por `mediaAssetId`. */
  archiveMediaByAssetId: Record<string, ArchiveMedia[]>;
}

export interface ListDuplicateMediaAssetsDeps {
  mediaAssetRepository: IMediaAssetRepository;
  archiveMediaRepository: IArchiveMediaRepository;
}

// Teto pragmático de varredura — mesmo espírito de `loadMemberPickerOptionsAction`
// (limit: 1000): o acervo é pequeno o suficiente hoje para uma varredura
// completa em memória; um teto maior evita paginação sofisticada sem
// duplicidade nenhuma passar despercebida no volume esperado.
const SCAN_LIMIT = 5000;

/**
 * Agrupa os `MediaAsset` do tenant por `sha256` onde há mais de um
 * registro — Fase B "Publicação avançada", item "Revisão de duplicidade
 * dedicada". Diferente do aviso individual no momento do upload
 * (`RegisterMediaAssetUseCase.possivelDuplicata`, que só compara contra o
 * próprio arquivo sendo enviado), esta varredura cobre TODO o acervo do
 * tenant de uma vez, para a tela administrativa dedicada
 * (`/admin/acervo/duplicidade`) decidir o que excluir.
 *
 * Reaproveita `findByTenant` de ambos os repositórios (sem método novo) —
 * agrupamento e cruzamento acontecem em memória aqui.
 */
export class ListDuplicateMediaAssetsUseCase {
  constructor(private readonly deps: ListDuplicateMediaAssetsDeps) {}

  async execute(ctx: AuthContext): Promise<DuplicateMediaAssetGroup[]> {
    requirePermission(ctx, 'archiveMedia:manage');

    const [assetsPage, mediaPage] = await Promise.all([
      this.deps.mediaAssetRepository.findByTenant(ctx.tenantId, { limit: SCAN_LIMIT }),
      this.deps.archiveMediaRepository.findByTenant(ctx.tenantId, { limit: SCAN_LIMIT }),
    ]);

    const mediaByAssetId = new Map<string, ArchiveMedia[]>();
    for (const media of mediaPage.items) {
      const list = mediaByAssetId.get(media.mediaAssetId) ?? [];
      list.push(media);
      mediaByAssetId.set(media.mediaAssetId, list);
    }

    const assetsBySha256 = new Map<string, MediaAsset[]>();
    for (const asset of assetsPage.items) {
      const list = assetsBySha256.get(asset.sha256) ?? [];
      list.push(asset);
      assetsBySha256.set(asset.sha256, list);
    }

    const groups: DuplicateMediaAssetGroup[] = [];
    for (const [sha256, mediaAssets] of assetsBySha256) {
      if (mediaAssets.length < 2) continue;
      const archiveMediaByAssetId: Record<string, ArchiveMedia[]> = {};
      for (const asset of mediaAssets) {
        archiveMediaByAssetId[asset.id] = mediaByAssetId.get(asset.id) ?? [];
      }
      groups.push({ sha256, mediaAssets, archiveMediaByAssetId });
    }

    return groups.sort((a, b) => b.mediaAssets.length - a.mediaAssets.length);
  }
}
