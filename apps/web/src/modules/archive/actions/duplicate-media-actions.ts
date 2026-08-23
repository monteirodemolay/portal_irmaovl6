'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

const DUPLICIDADE_PATH = '/admin/acervo/duplicidade';

export interface DuplicateArchiveMediaRef {
  id: string;
  archiveItemId: string;
  archiveItemTitulo: string;
  caption: string | null;
}

export interface DuplicateMediaAssetRef {
  id: string;
  originalName: string;
  size: number;
  createdAt: string;
  archiveMedias: DuplicateArchiveMediaRef[];
}

export interface DuplicateGroupView {
  sha256: string;
  assets: DuplicateMediaAssetRef[];
}

/**
 * Revisão de duplicidade dedicada (Fase B "Publicação avançada") — carrega
 * TODOS os grupos de `MediaAsset` duplicados do tenant
 * (`ListDuplicateMediaAssetsUseCase`) e resolve, para cada `ArchiveMedia`
 * associada, o título do `ArchiveItem` pai (a única resolução que o caso de
 * uso de domínio não faz, para não misturar camadas).
 */
export async function loadDuplicateMediaGroupsAction(): Promise<DuplicateGroupView[]> {
  const session = await requireSession();
  const container = createServerContainer();

  const groups = await container.useCases.listDuplicateMediaAssets.execute(session.authContext);

  const archiveItemIds = [
    ...new Set(
      groups.flatMap((group) =>
        group.mediaAssets.flatMap(
          (asset) =>
            group.archiveMediaByAssetId[asset.id]?.map((media) => media.archiveItemId) ?? [],
        ),
      ),
    ),
  ];
  const archiveItems = await Promise.all(
    archiveItemIds.map((id) => container.repositories.archiveItem.findById(id)),
  );
  const tituloByItemId = new Map(
    archiveItems
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .map((item) => [item.id, item.titulo]),
  );

  return groups.map((group) => ({
    sha256: group.sha256,
    assets: group.mediaAssets.map((asset) => ({
      id: asset.id,
      originalName: asset.originalName,
      size: asset.size,
      createdAt: asset.createdAt.toISOString(),
      archiveMedias: (group.archiveMediaByAssetId[asset.id] ?? []).map((media) => ({
        id: media.id,
        archiveItemId: media.archiveItemId,
        archiveItemTitulo: tituloByItemId.get(media.archiveItemId) ?? '—',
        caption: media.caption,
      })),
    })),
  }));
}

export interface DuplicateMediaActionState {
  ok: boolean;
  error: string | null;
}

/**
 * Exclui logicamente (soft delete) uma `ArchiveMedia` redundante —
 * reaproveita `SoftDeleteArchiveMediaUseCase` já existente (Fase 3), nunca
 * duplica a lógica de lixeira.
 */
export async function deleteDuplicateArchiveMediaAction(
  archiveMediaId: string,
): Promise<DuplicateMediaActionState> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.softDeleteArchiveMedia.execute(
    session.authContext,
    archiveMediaId,
  );
  if (!result.ok) return { ok: false, error: result.error.message };

  revalidatePath(DUPLICIDADE_PATH);
  return { ok: true, error: null };
}
