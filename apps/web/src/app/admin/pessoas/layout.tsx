import { hasPermission } from '@vl6/domain';
import { AdminWorkspaceShell } from '@/components/layout/admin-workspace-shell';
import { requireSession } from '@/lib/auth/require-session';
import { isAdminPathAllowed } from '@/lib/auth/is-admin-tier';

export default async function PessoasLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const ctx = session.authContext;
  const can = (permission: Parameters<typeof hasPermission>[1]) => hasPermission(ctx, permission);
  const allowed = (href: string) => isAdminPathAllowed(session.role, href);

  const items = [
    can('member:read') && allowed('/admin/pessoas/irmaos')
      ? { href: '/admin/pessoas/irmaos', label: 'Irmãos' }
      : null,
    can('boardTerm:read') && allowed('/admin/pessoas/gestoes')
      ? { href: '/admin/pessoas/gestoes', label: 'Gestões' }
      : null,
    can('paramasonicEntity:read') && allowed('/admin/pessoas/paramaconicas')
      ? { href: '/admin/pessoas/paramaconicas', label: 'Paramaçônicas' }
      : null,
    can('branding:read') && allowed('/admin/pessoas/loja')
      ? { href: '/admin/pessoas/loja', label: 'Loja' }
      : null,
    can('memberCentral:manage') && allowed('/admin/pessoas/central')
      ? { href: '/admin/pessoas/central', label: 'Central VL6' }
      : null,
    can('memberCentral:manage') && allowed('/admin/pessoas/negocios')
      ? { href: '/admin/pessoas/negocios', label: 'Negócios' }
      : null,
    can('user:read') && allowed('/admin/pessoas/usuarios')
      ? { href: '/admin/pessoas/usuarios', label: 'Acessos' }
      : null,
    can('role:read') && allowed('/admin/pessoas/permissoes')
      ? { href: '/admin/pessoas/permissoes', label: 'Permissões' }
      : null,
  ].filter((item): item is { href: string; label: string } => Boolean(item));

  return (
    <AdminWorkspaceShell
      title="Gestão de Pessoas e Loja"
      description="Administre cada Irmão como cadastro único e reutilize sua identidade em acesso, Diretório, Negócios, Conhecimento, Cripta, eventos e demais relações do Portal."
      items={items}
    >
      {children}
    </AdminWorkspaceShell>
  );
}
