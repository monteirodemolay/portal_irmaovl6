import { requirePagePermission } from '@/lib/auth/require-permission';
import { InitiationArchiveMigrationRunner } from '@/modules/archive/components/initiation-archive-migration-runner';

/**
 * Backfill retroativo dos itens de iniciação do Acervo VL6
 * (docs/architecture/11-acervo-vl6.md §11.5) — cria a entrada de memória
 * institucional pra todo Irmão já cadastrado com `dataIniciacao`
 * preenchida que ainda não tem uma. Ação deliberada do Administrador,
 * disparada manualmente aqui — nunca roda sozinha num deploy.
 */
export default async function IniciacaoMigracaoPage() {
  await requirePagePermission('member:manage');

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold">Backfill — Iniciações no Acervo</h1>
        <p className="text-muted text-sm">
          Cria o item de memória institucional no Acervo VL6 pra cada Irmão que já tem data de
          iniciação registrada e ainda não tem um item correspondente — reaproveitando um Evento já
          cadastrado na mesma data, ou criando um novo, mínimo. Pode ser executado mais de uma vez —
          só cobre quem ficou de fora da vez anterior. Todo item nasce como rascunho; a publicação
          continua manual pela Central de Publicação.
        </p>
      </div>
      <InitiationArchiveMigrationRunner />
    </div>
  );
}
