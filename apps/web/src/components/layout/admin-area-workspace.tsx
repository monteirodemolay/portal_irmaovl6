import { requireSession } from '@/lib/auth/require-session';
import type { AdminWorkspaceArea } from '@/modules/admin/lib/admin-tool-directory';
import { buildAreaNavigation } from '@/modules/admin/lib/admin-workspace';
import { AdminWorkspaceShell } from './admin-workspace-shell';

/**
 * Casca de uma área administrativa montada a partir do registro único de
 * telas (`ADMIN_TOOLS`): abas de rotina, "Mais nesta área" e o atalho para
 * Administração avançada, sempre filtrados pela sessão. Cada destino mantém
 * sua própria verificação de permissão no servidor.
 */
export async function AdminAreaWorkspace({
  area,
  children,
}: {
  area: AdminWorkspaceArea;
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const nav = buildAreaNavigation(area, session.authContext, session.role);
  return (
    <AdminWorkspaceShell
      title={nav.title}
      description={nav.description}
      items={nav.tabs}
      more={nav.more}
      advancedCount={nav.advancedCount}
    >
      {children}
    </AdminWorkspaceShell>
  );
}
