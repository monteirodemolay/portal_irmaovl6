import type { PermissionKey } from '@vl6/shared';
import { hasPermission, type AuthContext, type Role } from '@vl6/domain';
import {
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Lock,
  Users,
  Compass,
  Upload,
  Wrench,
} from '@vl6/ui';
import {
  buildAdvancedGroups,
  visibleUploadDestinations,
} from '@/modules/admin/lib/admin-workspace';
import { isAdminPathAllowed, isAdminTier } from '@/lib/auth/is-admin-tier';
import type { AppShellNavSection } from './app-shell';

/** A navegação não concede permissões: cada destino mantém seu gate no servidor. */
export function buildAdminNavSections(ctx: AuthContext, role: Role | null): AppShellNavSection[] {
  if (!isAdminTier(role)) return [];
  const any = (permissions: PermissionKey[]) => permissions.some((p) => hasPermission(ctx, p));
  const areas = [
    { href: '/admin', label: 'Central de Controle', icon: LayoutDashboard, allowed: true },
    {
      href: '/admin/publicacoes',
      label: 'Acontecimentos',
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
      label: 'Acervo e Biblioteca',
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
  ];
  const canUpload = visibleUploadDestinations(ctx, role).length > 0;
  const hasAdvanced = buildAdvancedGroups(ctx, role).length > 0;
  const sections: AppShellNavSection[] = [];
  if (canUpload)
    sections.push({
      items: [
        {
          href: '/admin/enviar',
          content: (
            <span className="bg-accent text-primary-dark -mx-1 flex flex-1 items-center gap-3 rounded-lg px-3 py-1.5 font-semibold shadow-sm">
              <Upload size={18} strokeWidth={2} />
              <span className="flex-1">Enviar arquivos</span>
            </span>
          ),
        },
      ],
    });
  sections.push({
    title: 'Rotina',
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
  });
  if (hasAdvanced)
    sections.push({
      title: 'Uso eventual',
      items: [
        {
          href: '/admin/avancado',
          activePaths: ['/admin/configuracoes'],
          content: (
            <>
              <Wrench size={18} strokeWidth={1.75} />
              <span className="flex-1">Administração avançada</span>
            </>
          ),
        },
      ],
    });
  if (role?.chave === 'super_admin')
    sections.push({
      title: 'Plataforma',
      items: [{ href: '/plataforma', content: <>Painel multi-tenant</> }],
    });
  return sections;
}
