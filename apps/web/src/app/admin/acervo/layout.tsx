import { hasPermission } from '@vl6/domain';
import { AdminWorkspaceShell } from '@/components/layout/admin-workspace-shell';
import { requireSession } from '@/lib/auth/require-session';
import { isAdminPathAllowed } from '@/lib/auth/is-admin-tier';

export default async function AcervoLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const ctx = session.authContext;
  const can = (permission: Parameters<typeof hasPermission>[1]) => hasPermission(ctx, permission);
  const allowed = (href: string) => isAdminPathAllowed(session.role, href);

  const items = [
    can('archiveItem:read') && allowed('/admin/acervo')
      ? { href: '/admin/acervo', label: 'Visão geral' }
      : null,
    (can('event:read') || can('archiveItem:create')) && allowed('/admin/publicacoes')
      ? { href: '/admin/publicacoes', label: 'Acontecimentos e memórias' }
      : null,
    can('libraryItem:read') && allowed('/admin/acervo/biblioteca')
      ? { href: '/admin/acervo/biblioteca', label: 'Biblioteca' }
      : null,
    can('archiveContribution:manage') && allowed('/admin/acervo/contribuicoes')
      ? { href: '/admin/acervo/contribuicoes', label: 'Contribuições' }
      : null,
    can('archiveExhibition:read') && allowed('/admin/acervo/exposicoes')
      ? { href: '/admin/acervo/exposicoes', label: 'Exposições' }
      : null,
    can('archiveMedia:manage') && allowed('/admin/acervo/metricas')
      ? { href: '/admin/acervo/metricas', label: 'Diagnóstico' }
      : null,
  ].filter((item): item is { href: string; label: string } => Boolean(item));

  return (
    <AdminWorkspaceShell
      title="Gestão da Memória e Acervo"
      description="Um único ambiente para inserir, acompanhar, editar, migrar e preservar a memória. O acontecimento é a origem; os demais conteúdos permanecem relacionados e verificáveis."
      items={items}
    >
      {children}
    </AdminWorkspaceShell>
  );
}
