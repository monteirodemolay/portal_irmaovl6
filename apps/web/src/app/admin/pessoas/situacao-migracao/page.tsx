import { requirePagePermission } from '@/lib/auth/require-permission';
import { SituacaoMigracaoRunner } from '@/modules/membership/components/situacao/situacao-migracao-runner';
import { BackfillDataFalecimentoRunner } from '@/modules/membership/components/situacao/backfill-data-falecimento-runner';
import { BackfillFraternidadeFemininaRunner } from '@/modules/family-legacy/components/backfill-fraternidade-feminina-runner';

export default async function SituacaoMigracaoPage() {
  await requirePagePermission('member:manage');

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold">Migração da Situação Maçônica</h1>
        <p className="text-muted text-sm">
          Cria o primeiro registro no histórico da Situação Maçônica pra cada Irmão que ainda não
          tem nenhum, a partir do status antigo do cadastro. Pode ser executada mais de uma vez — só
          cobre quem ficou de fora da vez anterior.
        </p>
      </div>
      <SituacaoMigracaoRunner />

      <div className="border-border bg-background rounded-xl border border-dashed p-4">
        <p className="text-sm font-semibold">Datas de falecimento em branco</p>
        <p className="text-muted mt-1 text-xs">
          In Memoriam sem a data de falecimento registrada no cadastro faz o Selo de Trajetória
          continuar contando &quot;tempo de Loja&quot; até hoje, em vez de parar no dia do
          falecimento. O botão abaixo completa a partir do histórico de Situação Maçônica de cada
          Irmão — seguro rodar quantas vezes for preciso.
        </p>
        <div className="mt-3">
          <BackfillDataFalecimentoRunner />
        </div>
      </div>

      <div className="border-border bg-background rounded-xl border border-dashed p-4">
        <p className="text-sm font-semibold">Fraternidade Feminina retroativa</p>
        <p className="text-muted mt-1 text-xs">
          Toda esposa de Irmão é automaticamente registrada como Fraternidade Feminina — regra já
          aplicada a todo vínculo conjugal novo. O botão abaixo cobre os vínculos de Cônjuge/
          Companheiro(a) cadastrados antes dessa regra existir. Seguro rodar quantas vezes for
          preciso.
        </p>
        <div className="mt-3">
          <BackfillFraternidadeFemininaRunner />
        </div>
      </div>
    </div>
  );
}
