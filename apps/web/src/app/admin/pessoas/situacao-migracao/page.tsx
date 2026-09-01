import { requirePagePermission } from '@/lib/auth/require-permission';
import { SituacaoMigracaoRunner } from '@/modules/membership/components/situacao/situacao-migracao-runner';

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
    </div>
  );
}
