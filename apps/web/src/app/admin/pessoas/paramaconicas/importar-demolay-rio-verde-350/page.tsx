import Link from 'next/link';
import { DEMOLAY_RIO_VERDE_350_ROSTER, hasPermission } from '@vl6/domain';
import { ArrowLeft } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { CrossReferenceDemolayRosterForm } from '@/modules/family-legacy/components/cross-reference-demolay-roster-form';
import { ImportDemolayRosterForm } from '@/modules/family-legacy/components/import-demolay-roster-form';

/**
 * Importação única da nominata do Capítulo DeMolay Rio Verde n.º 350,
 * fornecida pela Administração — cria a entidade "Capítulo Rio Verde n.º
 * 350" (se ainda não existir) e todos os integrantes como corpo próprio.
 * Idempotente: pode rodar de novo sem duplicar ninguém.
 */
export default async function ImportDemolayRosterPage() {
  const session = await requirePagePermission('paramasonicEntity:manage');
  const canCrossReference = hasPermission(session.authContext, 'familyLegacy:manage');

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link
        href="/admin/pessoas/paramaconicas"
        className="text-muted hover:text-accent flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeft size={16} />
        Entidades paramaçônicas
      </Link>

      <div>
        <h1 className="font-display text-2xl font-semibold">
          Importar nominata — Capítulo Rio Verde n.º 350
        </h1>
        <p className="text-muted mt-1 text-sm">
          {DEMOLAY_RIO_VERDE_350_ROSTER.length} integrantes transcritos da planilha fornecida pela
          Administração.
        </p>
      </div>

      <div className="border-border bg-background rounded-xl border p-4 text-sm">
        <p className="font-semibold">Antes de importar:</p>
        <ul className="text-muted mt-2 flex list-disc flex-col gap-1 pl-4">
          <li>
            Cria a entidade &quot;Capítulo Rio Verde n.º 350&quot; automaticamente, se ainda não
            existir.
          </li>
          <li>
            Todo integrante entra primeiro como corpo próprio da entidade — o cruzamento com Irmãos
            já cadastrados (quem também é Maçom, tipicamente marcado como
            &quot;Sênior&quot;/&quot;Sênior/Consultor&quot; na planilha, embora isso possa variar) é
            um passo separado, logo abaixo, disparado só depois de importar.
          </li>
          <li>
            O campo Cargo guarda a classificação de situação do DeMolay (Regular, Irregular, Sênior,
            Consultor, Inativo, Falecido) — Inativo e Falecido entram como situação
            &quot;Inativo&quot;, os demais como &quot;Ativo&quot;.
          </li>
          <li>Pode rodar de novo sem duplicar ninguém — casado por nome.</li>
        </ul>
      </div>

      <ImportDemolayRosterForm />

      {canCrossReference && <CrossReferenceDemolayRosterForm />}
    </div>
  );
}
