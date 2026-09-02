import { createServerContainer } from '@vl6/infra';
import { Button } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  loadFileMigrationCandidatesAction,
  loadLibraryMigrationCandidatesAction,
  loadMigrationCandidatesAction,
} from '@/modules/archive/actions/migration-actions';
import { MigrationManager } from '@/modules/archive/components/migration-manager';

/**
 * Migração assistida dos três domínios legados ainda fora do Acervo VL6
 * novo — Galeria (Fase 5, docs/architecture/11-acervo-vl6.md §11.6e),
 * Arquivos e Biblioteca (Fase C "Administração & métricas"). Lista os
 * registros ainda sem `ArchiveItem` correspondente e permite migrar um de
 * cada vez, sempre com confirmação explícita — nunca em lote/automático. O
 * registro de origem (`GalleryAlbum`/`FileAsset`/`LibraryItem`) nunca é
 * alterado; as telas legadas continuam funcionando exatamente como hoje.
 */
export default async function MigracaoPage() {
  const session = await requirePagePermission('archiveItem:create');
  const container = createServerContainer();

  const [galleryCandidates, fileCandidates, libraryCandidates, eventsPage] = await Promise.all([
    loadMigrationCandidatesAction(),
    loadFileMigrationCandidatesAction(),
    loadLibraryMigrationCandidatesAction(),
    container.useCases.listAllEvents.execute(session.authContext, { limit: 200 }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Migração do Acervo</h1>
          <p className="text-muted max-w-lg text-sm">
            Traga registros já cadastrados na Galeria, em Arquivos e na Biblioteca para o modelo
            novo do Acervo, um de cada vez. O registro original nunca é apagado nem alterado.
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <a href="/admin/acervo/iniciacao-migracao">Backfill de iniciações</a>
        </Button>
      </div>
      <MigrationManager
        galleryCandidates={galleryCandidates}
        fileCandidates={fileCandidates}
        libraryCandidates={libraryCandidates}
        events={eventsPage.items}
      />
    </div>
  );
}
