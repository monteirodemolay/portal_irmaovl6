import { hasPermission } from '@vl6/domain';
import { AdminWorkspaceShell } from '@/components/layout/admin-workspace-shell';
import { requireSession } from '@/lib/auth/require-session';
import { isAdminPathAllowed } from '@/lib/auth/is-admin-tier';

export default async function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const ctx = session.authContext;
  const can = (permission: Parameters<typeof hasPermission>[1]) => hasPermission(ctx, permission);
  const allowed = (href: string) => isAdminPathAllowed(session.role, href);

  const items = [
    allowed('/admin/configuracoes/geral')
      ? { href: '/admin/configuracoes/geral', label: 'Geral' }
      : null,
    can('tenant:manage') && allowed('/admin/configuracoes/integracoes')
      ? { href: '/admin/configuracoes/integracoes', label: 'Integrações' }
      : null,
    can('auditLog:read') && allowed('/admin/configuracoes/auditoria')
      ? { href: '/admin/configuracoes/auditoria', label: 'Auditoria' }
      : null,
    can('legalDocument:manage') && allowed('/admin/configuracoes/termos-e-privacidade')
      ? { href: '/admin/configuracoes/termos-e-privacidade', label: 'Termos e Privacidade' }
      : null,
    allowed('/admin/configuracoes/manutencao')
      ? { href: '/admin/configuracoes/manutencao', label: 'Manutenção' }
      : null,
  ].filter((item): item is { href: string; label: string } => Boolean(item));

  return (
    <AdminWorkspaceShell
      title="Gestão do Sistema"
      description="Centralize parâmetros, integrações, auditoria, documentos legais e manutenção em uma única área administrativa, sem espalhar configurações pelo Portal."
      items={items}
    >
      {children}
    </AdminWorkspaceShell>
  );
}
