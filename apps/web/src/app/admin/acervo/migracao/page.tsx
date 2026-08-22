import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { loadMigrationCandidatesAction } from '@/modules/archive/actions/migration-actions';
import { MigrationManager } from '@/modules/archive/components/migration-manager';

/**
 * Migração assistida da Galeria legada — Fase 5 (docs/architecture/
 * 11-acervo-vl6.md §11.6e). Lista `GalleryAlbum`s ainda sem `ArchiveItem`
 * correspondente e permite migrar um álbum de cada vez, sempre com
 * confirmação explícita — nunca em lote/automático. O `GalleryAlbum`/
 * `GalleryMedia` de origem nunca é alterado; a Galeria (`/admin/acervo/
 * galeria`, `/galeria`) continua funcionando exatamente como hoje.
 */
export default async function MigracaoPage() {
  const session = await requirePagePermission('archiveItem:create');
  const container = createServerContainer();

  const [candidates, eventsPage] = await Promise.all([
    loadMigrationCandidatesAction(),
    container.useCases.listAllEvents.execute(session.authContext, { limit: 200 }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Migração do Acervo</h1>
        <p className="text-muted max-w-lg text-sm">
          Traga álbuns já cadastrados na Galeria para o modelo novo do Acervo, um de cada vez. O
          álbum original nunca é apagado nem alterado — continua existindo normalmente em
          Fotografias.
        </p>
      </div>
      <MigrationManager candidates={candidates} events={eventsPage.items} />
    </div>
  );
}
