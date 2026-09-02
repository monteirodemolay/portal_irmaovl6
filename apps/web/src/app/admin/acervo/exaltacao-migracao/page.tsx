import { requirePagePermission } from '@/lib/auth/require-permission';
import { GraduationArchiveMigrationRunner } from '@/modules/archive/components/graduation-archive-migration-runner';
import { seedExaltationArchiveItemsAction } from '@/modules/archive/actions/graduation-migration-actions';

/**
 * Backfill retroativo dos itens de exaltação (3º grau, Mestre Maçom) do
 * Acervo VL6 — mesmo padrão de `/admin/acervo/iniciacao-migracao`, agora
 * para o terceiro marco da trajetória maçônica.
 */
export default async function ExaltacaoMigracaoPage() {
  await requirePagePermission('member:manage');

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold">Backfill — Exaltações no Acervo</h1>
        <p className="text-muted text-sm">
          Cria o item de memória institucional no Acervo VL6 pra cada Irmão que já tem data de
          exaltação registrada e ainda não tem um item correspondente — reaproveitando um Evento já
          cadastrado na mesma data, ou criando um novo, mínimo. Pode ser executado mais de uma vez —
          só cobre quem ficou de fora da vez anterior. Todo item nasce como rascunho; a publicação
          continua manual pela Central de Publicação.
        </p>
      </div>
      <GraduationArchiveMigrationRunner
        action={seedExaltationArchiveItemsAction}
        confirmMessage="Isso vai criar um item no Acervo VL6 (e, se preciso, um Evento) para todo Irmão com data de exaltação registrada que ainda não tem um. Pode ser executado mais de uma vez sem duplicar. Continuar?"
        emptyMessage="Nenhum Irmão pendente — todos os que têm data de exaltação já têm item no Acervo."
        itemLabel="data de exaltação"
      />
    </div>
  );
}
