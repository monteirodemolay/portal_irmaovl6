import { requirePagePermission } from '@/lib/auth/require-permission';
import { loadDuplicateMediaGroupsAction } from '@/modules/archive/actions/duplicate-media-actions';
import { DuplicateMediaManager } from '@/modules/archive/components/duplicate-media-manager';

/**
 * Revisão de duplicidade dedicada — Fase B "Publicação avançada"
 * (docs/architecture/11-acervo-vl6.md). Lista TODOS os grupos de
 * `MediaAsset` com o mesmo hash no acervo do tenant (diferente do aviso
 * individual no momento do upload) e permite excluir logicamente as cópias
 * redundantes.
 */
export default async function DuplicidadePage() {
  await requirePagePermission('archiveMedia:manage');
  const groups = await loadDuplicateMediaGroupsAction();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Duplicidade no Acervo</h1>
        <p className="text-muted max-w-lg text-sm">
          Arquivos com o mesmo conteúdo enviados mais de uma vez — revise e mantenha só uma cópia de
          cada.
        </p>
      </div>
      <DuplicateMediaManager initialGroups={groups} />
    </div>
  );
}
