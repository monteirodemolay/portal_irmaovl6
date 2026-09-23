import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { LegalAcceptanceOverviewRow } from '@vl6/domain';
import { Badge, DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { LEGAL_DOCUMENT_TITLES } from '@/lib/legal/document-slug';

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(date),
  );
}

function DocStatusCell({
  status,
}: {
  status: LegalAcceptanceOverviewRow['porDocumento'][keyof LegalAcceptanceOverviewRow['porDocumento']];
}) {
  if (!status.versaoVigente) {
    return <span className="text-muted text-xs">Não publicado</span>;
  }
  if (status.pendente) {
    return (
      <div>
        <Badge variant="warning">Pendente</Badge>
        <p className="text-muted mt-1 text-xs">
          {status.versaoAceita ? `Aceitou v${status.versaoAceita}` : 'Nunca aceitou'} · vigente v
          {status.versaoVigente}
        </p>
      </div>
    );
  }
  return (
    <div>
      <Badge variant="success">Em dia</Badge>
      <p className="text-muted mt-1 text-xs">
        v{status.versaoAceita} em {formatDate(status.aceitoEm)}
      </p>
    </div>
  );
}

/**
 * Painel administrativo — quem já aceitou a Política de Privacidade e os
 * Termos de Uso vigentes, um Irmão por linha. Complementa a própria visão
 * de cada Irmão em `/irmaos/configuracoes/termos-e-privacidade`, que só
 * mostra o aceite dele mesmo.
 */
export default async function LegalAcceptanceOverviewPage() {
  const session = await requirePagePermission('legalDocument:manage');
  const container = createServerContainer();

  const result = await container.useCases.listLegalAcceptanceOverview.execute(session.authContext);
  const rows = result.ok ? result.value : [];
  const pendentesCount = rows.filter((r) =>
    Object.values(r.porDocumento).some((d) => d.pendente),
  ).length;

  const columns: DataTableColumn<LegalAcceptanceOverviewRow>[] = [
    {
      key: 'nome',
      header: 'Irmão',
      cell: (r) => (
        <div>
          <p className="font-medium">{r.nomeCompleto ?? '(sem cadastro no Diretório)'}</p>
          <p className="text-muted text-xs">{r.email}</p>
        </div>
      ),
    },
    {
      key: 'politica',
      header: LEGAL_DOCUMENT_TITLES.politica_privacidade,
      cell: (r) => <DocStatusCell status={r.porDocumento.politica_privacidade} />,
    },
    {
      key: 'termos',
      header: LEGAL_DOCUMENT_TITLES.termos_uso,
      cell: (r) => <DocStatusCell status={r.porDocumento.termos_uso} />,
    },
    {
      key: 'acoes',
      header: '',
      cell: (r) => (
        <Link
          href={`/admin/configuracoes/termos-e-privacidade/${r.userId}`}
          className="text-accent text-xs font-medium hover:underline"
        >
          Ver histórico
        </Link>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Termos e Privacidade</h1>
        <p className="text-muted text-sm">
          {rows.length} conta{rows.length === 1 ? '' : 's'} de acesso · {pendentesCount} pendente
          {pendentesCount === 1 ? '' : 's'} de aceite da versão vigente.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.userId}
        emptyState={<EmptyState title="Nenhuma conta de acesso encontrada" />}
      />
    </div>
  );
}
