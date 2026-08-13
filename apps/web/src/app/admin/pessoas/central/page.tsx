import { createServerContainer } from '@vl6/infra';
import { Badge, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  ReactivateCentralProfileButton,
  SuspendCentralProfileButton,
} from '@/modules/central/components/central-moderation-actions';

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(date));
}

export default async function CentralModerationPage() {
  const session = await requirePagePermission('memberCentral:manage');

  const container = createServerContainer();
  const result = await container.useCases.listCentralProfilesAdminView.execute(session.authContext);
  const rows = result.ok ? result.value : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Central VL6</h1>
        <p className="text-muted mt-1 max-w-2xl text-sm">
          Status de publicação do diretório voluntário — a Administração pode suspender ou reativar
          uma publicação, mas nunca decide o que fica visível por um Irmão. Só quem já abriu a aba
          &ldquo;Central VL6&rdquo; do próprio perfil aparece aqui.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Ninguém abriu a Central ainda" />
      ) : (
        <div className="border-border bg-surface overflow-x-auto rounded-lg border shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-border border-b text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Irmão</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Suspenso em</th>
                <th className="px-4 py-3 font-medium">Motivo</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.memberId} className="border-border border-b last:border-0">
                  <td className="px-4 py-3">{row.nomeCompleto}</td>
                  <td className="px-4 py-3">
                    {row.suspendedAt ? (
                      <Badge variant="destructive">Suspenso</Badge>
                    ) : (
                      <Badge variant={row.profilePublished ? 'success' : 'outline'}>
                        {row.profilePublished ? 'Publicado' : 'Não publicado'}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatDate(row.suspendedAt)}</td>
                  <td className="text-muted px-4 py-3">{row.suspendedReason ?? '—'}</td>
                  <td className="px-4 py-3">
                    {row.suspendedAt ? (
                      <ReactivateCentralProfileButton memberId={row.memberId} />
                    ) : (
                      <SuspendCentralProfileButton
                        memberId={row.memberId}
                        memberName={row.nomeCompleto}
                      />
                    )}
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
