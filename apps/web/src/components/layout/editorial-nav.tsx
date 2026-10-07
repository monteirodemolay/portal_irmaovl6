import { hasPermission, type AuthContext, type Role } from '@vl6/domain';
import { isAdminPathAllowed } from '@/lib/auth/is-admin-tier';
import { TabNav } from './tab-nav';
import type { PermissionKey } from '@vl6/shared';
const links: { href: string; label: string; permission: PermissionKey | PermissionKey[] }[] = [
  {
    href: '/admin/publicacoes',
    label: 'Planejamento',
    permission: [
      'event:read',
      'announcement:read',
      'news:read',
      'communication:manage',
      'archiveItem:create',
    ],
  },
  { href: '/admin/conteudo/agenda', label: 'Agenda', permission: 'event:read' },
  { href: '/admin/conteudo/avisos', label: 'Avisos', permission: 'announcement:read' },
  { href: '/admin/conteudo/noticias', label: 'Notícias', permission: 'news:read' },
  { href: '/admin/comunicacao', label: 'Comunicação', permission: 'communication:manage' },
  {
    href: '/admin/comunicacao/modelos',
    label: 'Modelos e artes',
    permission: 'communication:manage',
  },
  {
    href: '/admin/acervo/publicar',
    label: 'Publicação do Acervo',
    permission: 'archiveItem:create',
  },
  {
    href: '/admin/conteudo/notificacoes/nova',
    label: 'Notificações',
    permission: 'notification:manage',
  },
  { href: '/admin/conteudo/frases', label: 'Frases', permission: 'quote:read' },
  { href: '/admin/conteudo/links', label: 'Links úteis', permission: 'link:read' },
];
export function EditorialNav({
  authContext,
  role,
}: {
  authContext: AuthContext;
  role: Role | null;
}) {
  return (
    <TabNav
      items={links
        .filter(
          (l) =>
            isAdminPathAllowed(role, l.href) &&
            (Array.isArray(l.permission) ? l.permission : [l.permission]).some((p) =>
              hasPermission(authContext, p),
            ),
        )
        .map(({ href, label }) => ({ href, label }))}
    />
  );
}
