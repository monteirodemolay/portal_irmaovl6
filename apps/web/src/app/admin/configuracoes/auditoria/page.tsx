import type { AuditLog } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from '@/lib/audit/audit-action-label';
import { resolveActorLabel } from '@/lib/audit/resolve-actor-label';

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(date),
  );
}

interface AuditRow {
  entry: AuditLog;
  actorLabel: string;
}

/**
 * Trilha de auditoria completa — mesma fonte do painel "Atividade recente"
 * do Dashboard (`ListAuditLogUseCase`), só que sem o recorte de 8 linhas.
 * Cobre as coleções envolvidas por `withAudit` (`packages/infra/src/
 * container.ts`) — não é 100% do sistema, só o que passa pelo wrapper.
 * Sem paginação de propósito: volume baixo, mesma leitura de uma única
 * página (100 mais recentes) já cobre o uso esperado.
 */
export default async function AuditLogAdminPage() {
  const session = await requirePagePermission('auditLog:read');
  const container = createServerContainer();

  const page = await container.useCases.listAuditLog.execute(
    session.authContext,
    {},
    { limit: 100 },
  );

  const rows: AuditRow[] = await Promise.all(
    page.items.map(async (entry) => ({
      entry,
      actorLabel: await resolveActorLabel(container, entry.usuarioId),
    })),
  );

  const columns: DataTableColumn<AuditRow>[] = [
    {
      key: 'evento',
      header: 'Evento',
      cell: (r) => (
        <div>
          <span className="text-accent block text-[10px] font-semibold uppercase tracking-wider">
            {AUDIT_ENTITY_LABELS[r.entry.entidade] ?? r.entry.entidade}
          </span>
          <span className="font-medium">{AUDIT_ACTION_LABELS[r.entry.acao]}</span>
        </div>
      ),
    },
    { key: 'quem', header: 'Quem', cell: (r) => r.actorLabel },
    { key: 'quando', header: 'Quando', cell: (r) => formatDateTime(r.entry.timestamp) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Auditoria</h1>
        <p className="text-muted text-sm">
          Trilha de alterações registradas automaticamente nos principais cadastros do Portal —
          últimos {page.items.length} eventos.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.entry.id}
        emptyState={<EmptyState title="Nenhum evento de auditoria registrado ainda" />}
      />
    </div>
  );
}
