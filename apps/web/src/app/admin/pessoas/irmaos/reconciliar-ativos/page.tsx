import type {
  ActiveMembersReconciliationAction,
  ActiveMembersReconciliationRow,
} from '@vl6/domain';
import { MEMBER_SITUATION_STATUS_LABELS } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { Badge } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { ApplyReconciliationButton } from '@/modules/membership/components/apply-reconciliation-button';

const ACTION_LABEL: Record<ActiveMembersReconciliationAction, string> = {
  manter_ativo: 'Na lista — continua Ativo',
  confirmar_manualmente: 'Na lista, mas Situação não é Ativo — conferir',
  desligar_e_bloquear: 'Fora da lista — vira Desligado + acesso bloqueado',
  so_bloquear_acesso: 'Fora da lista — só o acesso é bloqueado',
  sem_alteracao_falecido: 'In Memoriam — nada muda',
};

const ACTION_BADGE_VARIANT: Record<
  ActiveMembersReconciliationAction,
  'success' | 'warning' | 'destructive' | 'outline' | 'default'
> = {
  manter_ativo: 'success',
  confirmar_manualmente: 'warning',
  desligar_e_bloquear: 'destructive',
  so_bloquear_acesso: 'destructive',
  sem_alteracao_falecido: 'outline',
};

function Section({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: ActiveMembersReconciliationRow[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h2 className="font-display text-lg font-semibold">
          {title} <span className="text-muted text-sm font-normal">({rows.length})</span>
        </h2>
        <p className="text-muted text-xs">{description}</p>
      </div>
      <div className="border-border bg-surface overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.memberId} className="border-border border-b last:border-0">
                <td className="px-4 py-2.5 font-medium">{row.nomeCompleto}</td>
                <td className="text-muted px-4 py-2.5 text-xs">
                  {MEMBER_SITUATION_STATUS_LABELS[row.situacaoAtual]}
                </td>
                <td className="text-muted px-4 py-2.5 text-xs">
                  {row.temAcessoAtivo ? 'Tem acesso ao Portal' : 'Sem acesso ao Portal'}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Badge variant={ACTION_BADGE_VARIANT[row.acao]} className="whitespace-nowrap">
                    {ACTION_LABEL[row.acao]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Reconciliação de cadastro ativo — pedido direto do Administrador em
 * 2026-09-14 (ver `ACTIVE_MEMBERS_RECONCILIATION_LIST`): só os Irmãos da
 * lista permanecem Ativos com acesso ao Portal; todo o resto é bloqueado
 * (e, quando ainda estava "Ativo", vira "Desligado" — motivo "Outro", a
 * confirmar individualmente depois). Ferramenta de uso único — a prévia é
 * só leitura; nada muda até o Administrador clicar em "Aplicar".
 */
export default async function ReconciliarAtivosPage() {
  const session = await requirePagePermission('member:manage');
  const container = createServerContainer();

  const { linhas, nomesNaoEncontrados } =
    await container.useCases.previewActiveMembersReconciliation.execute(session.authContext);

  const manterAtivo = linhas.filter((r) => r.acao === 'manter_ativo');
  const confirmarManualmente = linhas.filter((r) => r.acao === 'confirmar_manualmente');
  const desligarEBloquear = linhas.filter((r) => r.acao === 'desligar_e_bloquear');
  const soBloquearAcesso = linhas.filter((r) => r.acao === 'so_bloquear_acesso');
  const semAlteracaoFalecido = linhas.filter((r) => r.acao === 'sem_alteracao_falecido');
  const affectedCount = desligarEBloquear.length + soBloquearAcesso.length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">Reconciliar Irmãos Ativos</h1>
        <p className="text-muted mt-1 text-sm">
          Prévia de quem fica Ativo e com acesso ao Portal, contra a lista informada pelo
          Administrador. Nada é alterado até clicar em "Aplicar reconciliação".
        </p>
      </div>

      {nomesNaoEncontrados.length > 0 && (
        <div className="border-destructive/30 bg-destructive/5 flex flex-col gap-2 rounded-lg border p-4">
          <p className="text-destructive text-sm font-semibold">
            {nomesNaoEncontrados.length} nome(s) da lista sem cadastro correspondente
          </p>
          <p className="text-muted text-xs">
            Provável erro de digitação no nome ou Irmão ainda não cadastrado — confira antes de
            aplicar, senão esse Irmão fica sem ser marcado como ativo.
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {nomesNaoEncontrados.map((nome) => (
              <li key={nome}>{nome}</li>
            ))}
          </ul>
        </div>
      )}

      {affectedCount > 0 && <ApplyReconciliationButton affectedCount={affectedCount} />}

      <Section
        title="Na lista de ativos"
        description="Já estão com Situação Ativo — nada muda."
        rows={manterAtivo}
      />
      <Section
        title="Na lista, mas Situação diferente de Ativo"
        description="O nome bateu com a lista, mas o cadastro não está como Ativo agora — confira manualmente, nada é alterado automaticamente."
        rows={confirmarManualmente}
      />
      <Section
        title="Fora da lista — Situação Ativo hoje"
        description="Vira Desligado (motivo Outro) e o acesso ao Portal é bloqueado."
        rows={desligarEBloquear}
      />
      <Section
        title="Fora da lista — já tinha outra Situação"
        description="A Situação continua a mesma; só o acesso ao Portal é bloqueado."
        rows={soBloquearAcesso}
      />
      <Section
        title="In Memoriam"
        description="Fora da lista, mas em memória — nunca alterado por esta ferramenta."
        rows={semAlteracaoFalecido}
      />
    </div>
  );
}
