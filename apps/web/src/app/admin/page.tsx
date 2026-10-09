import { AdminControlCenter } from '@/modules/admin/components/admin-control-center';
import { loadDashboardOverview } from '@/modules/admin/lib/load-dashboard-overview';
import { overviewPeriod } from '@/modules/admin/lib/dashboard-overview-model';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Central de Controle · Administração VL6' };

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  let warning: string | null = null;
  let from = params.from,
    to = params.to;
  try {
    overviewPeriod(from, to);
  } catch {
    warning = 'O intervalo informado é inválido ou excede um ano. Mostrando o mês atual.';
    from = undefined;
    to = undefined;
  }
  const data = await loadDashboardOverview(from, to);
  return (
    <div className="space-y-6">
      {warning && (
        <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {warning}
        </p>
      )}
      <AdminControlCenter key={`${data.from}:${data.to}:${data.updatedAt}`} data={data} />
    </div>
  );
}
