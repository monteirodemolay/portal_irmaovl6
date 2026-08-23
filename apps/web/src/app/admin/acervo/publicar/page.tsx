import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { PublishWizard } from '@/modules/archive/components/publish-hub/publish-wizard';

/**
 * Central de Publicação — Fase 2 (docs/architecture/11-acervo-vl6.md
 * §11.5/§11.6). Wizard de 4 passos (Evento → Enviar → Organizar →
 * Publicar); esta página só monta o estado inicial (eventos, rascunhos e
 * Gestões do tenant), toda a navegação entre passos é client-side.
 */
export default async function PublicarPage() {
  const session = await requirePagePermission('archiveItem:create');
  const container = createServerContainer();

  const [eventsPage, draftsPage, boardTerms] = await Promise.all([
    container.useCases.listAllEvents.execute(session.authContext, { limit: 200 }),
    container.repositories.archiveItem.findByTenant(session.authContext.tenantId, { limit: 100 }),
    container.repositories.boardTerm.listByTenant(session.authContext.tenantId),
  ]);

  const drafts = draftsPage.items.filter((item) => item.publicacaoStatus === 'rascunho');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Central de Publicação</h1>
        <p className="text-muted max-w-lg text-sm">
          Envie fotos, vídeos, áudios e documentos de um Evento num só fluxo — Evento → Enviar →
          Organizar → Publicar.
        </p>
      </div>
      <PublishWizard events={eventsPage.items} drafts={drafts} boardTerms={boardTerms} />
    </div>
  );
}
