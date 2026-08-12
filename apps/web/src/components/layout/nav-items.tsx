import { hasPermission, type AuthContext, type Role } from '@vl6/domain';
import type { PermissionKey } from '@vl6/shared';
import {
  BookOpen,
  Building2,
  CalendarDays,
  Download,
  FileText,
  Image as GalleryIcon,
  LayoutDashboard,
  Megaphone,
  Newspaper,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
} from '@vl6/ui';
import { isAdminTier } from '@/lib/auth/is-admin-tier';
import type { Dictionary } from '@/lib/i18n/get-dictionary';
import type { AppShellNavSection } from './app-shell';

const ICON_SIZE = 18;
const ICON_STROKE = 1.75;

// Sem itens que só duplicam o site institucional (Nossa Loja, Diretoria
// pública, Contato) — esse é o papel do www.vl6.com.br, não do Portal
// (docs/architecture/07 §7.0). Notícias fica de fora da navegação por ora:
// é conteúdo autoral do Portal (não espelha o site), mas a Loja sinalizou
// que as publicações vão continuar saindo pelo site institucional — o
// admin de Notícias (`/admin/noticias`) segue existindo, só não fica
// linkado aqui; revisitar se um dia isso mudar. `/admin/usuarios` segue o
// mesmo padrão: cadastro de Irmão e acesso ao Portal foram unificados em
// `/admin/irmaos` (foto, grau, datas e "Acesso ao Portal" no mesmo
// formulário — docs/architecture/06), então o fluxo normal nunca mais
// passa por Usuários. A rota continua existindo só para o caso excepcional
// de uma conta de acesso sem Member (ex.: convite avulso técnico), por
// isso some da navegação em vez de ser removida.
const PORTAL_ITEMS = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/perfil', label: 'Meu Perfil', icon: UserCircle },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/avisos', label: 'Avisos', icon: Megaphone },
  { href: '/biblioteca', label: 'Biblioteca', icon: BookOpen },
  { href: '/arquivos', label: 'Arquivos', icon: FileText },
  { href: '/galeria', label: 'Galeria', icon: GalleryIcon },
  { href: '/downloads', label: 'Downloads', icon: Download },
] as const;

interface AdminNavItemDef {
  href: string;
  labelKey: keyof Dictionary['nav'];
  icon: typeof LayoutDashboard;
  permission: PermissionKey;
}

const ADMIN_ITEMS: AdminNavItemDef[] = [
  { href: '/admin', labelKey: 'dashboard', icon: LayoutDashboard, permission: 'tenant:read' },
  {
    href: '/admin/loja',
    labelKey: 'storeManagement',
    icon: Building2,
    permission: 'branding:read',
  },
  { href: '/admin/irmaos', labelKey: 'memberRegistry', icon: Users, permission: 'member:read' },
  { href: '/admin/gestoes', labelKey: 'boards', icon: ShieldCheck, permission: 'boardTerm:read' },
  { href: '/admin/permissoes', labelKey: 'permissions', icon: Settings, permission: 'role:read' },
  {
    href: '/admin/avisos',
    labelKey: 'announcements',
    icon: Megaphone,
    permission: 'announcement:read',
  },
  { href: '/admin/noticias', labelKey: 'news', icon: Newspaper, permission: 'news:read' },
  { href: '/admin/arquivos', labelKey: 'files', icon: FileText, permission: 'file:read' },
  {
    href: '/admin/biblioteca',
    labelKey: 'library',
    icon: BookOpen,
    permission: 'libraryItem:read',
  },
  { href: '/admin/agenda', labelKey: 'agenda', icon: CalendarDays, permission: 'event:read' },
  { href: '/admin/galeria', labelKey: 'gallery', icon: GalleryIcon, permission: 'gallery:read' },
  {
    href: '/admin/integracoes',
    labelKey: 'integrations',
    icon: Settings,
    permission: 'tenant:manage',
  },
  { href: '/admin/configuracoes', labelKey: 'settings', icon: Settings, permission: 'tenant:read' },
];

function navContent(Icon: typeof LayoutDashboard, label: string) {
  return (
    <>
      <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} />
      <span>{label}</span>
    </>
  );
}

/**
 * Monta as seções da sidebar compartilhada (`AppShell`) a partir da sessão
 * real — nunca escondidas só por CSS. "Portal" aparece pra qualquer
 * autenticado; "Administração" só pra Administrador da Loja/Geral, com
 * cada item ainda filtrado pela permissão específica (mesma regra de
 * `admin/layout.tsx`); "Sistema" só pro Administrador Geral, apontando pro
 * painel `/plataforma` que já existe — nenhuma tela nova inventada aqui.
 */
export function buildNavSections(
  authContext: AuthContext,
  role: Role | null,
  dictionary: Dictionary,
): AppShellNavSection[] {
  const sections: AppShellNavSection[] = [
    {
      title: 'Portal',
      items: PORTAL_ITEMS.map((item) => ({
        href: item.href,
        content: navContent(item.icon, item.label),
      })),
    },
  ];

  if (isAdminTier(role)) {
    const visibleAdminItems = ADMIN_ITEMS.filter((item) =>
      hasPermission(authContext, item.permission),
    );
    if (visibleAdminItems.length > 0) {
      sections.push({
        title: 'Administração',
        items: visibleAdminItems.map((item) => ({
          href: item.href,
          content: navContent(item.icon, dictionary.nav[item.labelKey]),
        })),
      });
    }
  }

  if (role?.chave === 'super_admin') {
    sections.push({
      title: 'Sistema',
      items: [
        {
          href: '/plataforma',
          content: navContent(Building2, 'Painel da Plataforma'),
        },
      ],
    });
  }

  return sections;
}
