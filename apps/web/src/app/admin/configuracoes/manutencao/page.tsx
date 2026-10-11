import { requireSession } from '@/lib/auth/require-session';
import { ADMIN_TOOLS } from '@/modules/admin/lib/admin-tool-directory';
import { canUseAdminTool } from '@/modules/admin/lib/admin-workspace';
import { AdminToolDirectory } from '@/modules/admin/components/admin-tool-directory';
export default async function MaintenancePage() {
  const session = await requireSession();
  const tools = ADMIN_TOOLS.filter(
    (t) => t.group === 'Manutenção' && canUseAdminTool(t, session.authContext, session.role),
  ).map(({ href, label, group }) => ({ href, label, group }));
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-semibold">Manutenção e importações</h1>
      <p className="text-muted">
        Ferramentas especializadas de reconciliação e ensaio. Cada destino mantém suas permissões,
        conferências e confirmações antes de executar.
      </p>
      <AdminToolDirectory tools={tools} />
    </div>
  );
}
