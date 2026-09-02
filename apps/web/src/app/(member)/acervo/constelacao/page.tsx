import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { InteractiveConstellationExplorer } from '@/modules/archive/components/interactive-constellation-explorer';

export default async function ArchiveConstellationPage() {
  const session = await requirePagePermission('archiveRelation:read');

  const container = createServerContainer();
  const { groups } = await container.useCases.getConstellationRoots.execute(session.authContext);

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title="Constelação da Memória"
        description="O contexto que conecta pessoas, gestões, eventos, coleções e itens do Acervo — clique em qualquer grupo ou registro para explorar seus vínculos."
        backHref="/acervo"
      />

      <InteractiveConstellationExplorer roots={groups} />
    </div>
  );
}
