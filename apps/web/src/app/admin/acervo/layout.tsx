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
    (can('event:read') || can('archiveItem:create')) && allowed('/admin/publicacoes')
      ? { href: '/admin/publicacoes', label: 'Memória por acontecimento' }
      : null,
    can('libraryItem:read') && allowed('/admin/acervo/biblioteca')
      ? { href: '/admin/acervo/biblioteca', label: 'Biblioteca' }
      : null,
    can('archiveContribution:manage') && allowed('/admin/acervo/contribuicoes')
      ? { href: '/admin/acervo/contribuicoes', label: 'Contribuições' }
      : null,
    can('archiveCollection:read') && allowed('/admin/acervo/colecoes')
      ? { href: '/admin/acervo/colecoes', label: 'Coleções' }
      : null,
    can('archiveRelation:read') && allowed('/admin/acervo/relacoes')
      ? { href: '/admin/acervo/relacoes', label: 'Relações' }
      : null,
    can('archiveExhibition:read') && allowed('/admin/acervo/exposicoes')
      ? { href: '/admin/acervo/exposicoes', label: 'Exposições' }
      : null,
    can('archiveCatalog:read') && allowed('/admin/acervo/catalogacao')
      ? { href: '/admin/acervo/catalogacao', label: 'Catalogação' }
      : null,
    can('archiveMedia:manage') && allowed('/admin/acervo/metricas')
      ? { href: '/admin/acervo/metricas', label: 'Diagnóstico' }
      : null,
  ].filter((item): item is { href: string; label: string } => Boolean(item));

  return (
    <AdminWorkspaceShell
      title="Gestão da Memória e Acervo"
      description="Organize a memória institucional em um único ambiente. Acontecimentos, mídias, coleções, relações e curadoria referenciam os mesmos registros, sem recriar conteúdo."
      items={items}
    >
      {children}
    </AdminWorkspaceShell>
  );
}
