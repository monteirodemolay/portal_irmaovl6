import { createServerContainer } from '@vl6/infra';
import { EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { BusinessReviewActions } from '@/modules/central/components/business-review-actions';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(date),
  );
}

export default async function BusinessSubmissionsAdminPage() {
  const session = await requirePagePermission('memberCentral:manage');

  const container = createServerContainer();
  const result = await container.useCases.listBusinessSubmissions.execute(session.authContext);
  const rows = result.ok ? result.value : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Negócios & Serviços</h1>
        <p className="text-muted mt-1 max-w-2xl text-sm">
          Toda empresa ou atividade que um Irmão publica na Central passa por aqui antes de aparecer
          no Diretório de Negócios & Serviços. Aprovar libera a visibilidade; rejeitar devolve pro
          Irmão revisar e reenviar — nada fica travado.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Nenhuma atividade aguardando revisão" />
      ) : (
        <div className="border-border bg-surface overflow-x-auto rounded-lg border shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-border border-b text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Irmão</th>
                <th className="px-4 py-3 font-medium">Empresa/atividade</th>
                <th className="px-4 py-3 font-medium">Segmento</th>
                <th className="px-4 py-3 font-medium">Cidade</th>
                <th className="px-4 py-3 font-medium">Enviado em</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.businessId} className="border-border border-b last:border-0">
                  <td className="px-4 py-3">{row.memberNomeCompleto}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{row.nomeEmpresa}</p>
                    {row.descricao && <p className="text-muted text-xs">{row.descricao}</p>}
                  </td>
                  <td className="text-muted px-4 py-3">{row.segmento ?? '—'}</td>
                  <td className="text-muted px-4 py-3">{row.cidade ?? '—'}</td>
                  <td className="text-muted px-4 py-3">{formatDate(row.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <BusinessReviewActions memberId={row.memberId} businessId={row.businessId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
