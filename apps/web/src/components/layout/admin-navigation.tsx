import type { PermissionKey } from '@vl6/shared';
import { hasPermission, type AuthContext, type Role } from '@vl6/domain';
import {
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Lock,
  Settings,
  Users,
  Compass,
} from '@vl6/ui';
import { isAdminPathAllowed, isAdminTier } from '@/lib/auth/is-admin-tier';
import type { AppShellNavSection } from './app-shell';

/** A navegação não concede permissões: cada destino mantém seu gate no servidor. */
export function buildAdminNavSections(ctx: AuthContext, role: Role | null): AppShellNavSection[] {
  if (!isAdminTier(role)) return [];
  const any = (permissions: PermissionKey[]) => permissions.some((p) => hasPermission(ctx, p));
  const areas = [
    { href: '/admin', label: 'Início e controle', icon: LayoutDashboard, allowed: true },
    {
      href: '/admin/publicacoes',
      label: 'Registrar e publicar',
      icon: CalendarDays,
      allowed: any([
        'event:read',
        'announcement:read',
        'news:read',
        'communication:manage',
        'archiveItem:create',
      ]),
    },
    {
      href: '/admin/pessoas',
      label: 'Pessoas e Loja',
      icon: Users,
      allowed: any([
        'member:read',
        'user:read',
        'role:read',
        'boardTerm:read',
        'branding:read',
        'memberCentral:manage',
        'paramasonicEntity:read',
      ]),
    },
    {
      href: '/admin/acervo',
      label: 'Memória e Biblioteca',
      icon: Compass,
      allowed: any([
        'file:read',
        'libraryItem:read',
        'gallery:read',
        'archiveItem:create',
        'archiveCatalog:read',
      ]),
    },
    {
      href: '/admin/conhecimento',
      label: 'Conhecimento',
      icon: GraduationCap,
      allowed: hasPermission(ctx, 'knowledge:manage') || hasPermission(ctx, 'tenant:manage'),
    },
    {
      href: '/admin/cripta',
      label: 'Cripta',
      icon: Lock,
      allowed: hasPermission(ctx, 'tenant:manage'),
    },
    {
      href: '/admin/configuracoes',
      label: 'Configurações e auditoria',
      icon: Settings,
      allowed:
        hasPermission(ctx, 'tenant:read') ||
        hasPermission(ctx, 'auditLog:read') ||
        hasPermission(ctx, 'legalDocument:manage'),
    },
  ];
  const sections: AppShellNavSection[] = [
    {
      title: 'Administração facilitada',
      items: areas
        .filter((a) => a.allowed && isAdminPathAllowed(role, a.href))
        .map((a) => ({
          href: a.href,
          activePaths:
            a.href === '/admin/publicacoes' ? ['/admin/conteudo', '/admin/comunicacao'] : undefined,
          content: (
            <>
              <a.icon size={18} strokeWidth={1.75} />
              <span className="flex-1">{a.label}</span>
            </>
          ),
        })),
    },
  ];
  if (role?.chave === 'super_admin')
    sections.push({
      title: 'Plataforma',
      items: [{ href: '/plataforma', content: <>Painel multi-tenant</> }],
    });
  return sections;
}
