import { hasPermission, type AuthContext, type Role } from '@vl6/domain';
import type { PermissionKey } from '@vl6/shared';
import {
  Building2,
  CalendarDays,
  Compass,
  Image as GalleryIcon,
  LayoutDashboard,
  Megaphone,
  Settings,
  Users,
} from '@vl6/ui';
import { isAdminTier } from '@/lib/auth/is-admin-tier';
import type { Dictionary } from '@/lib/i18n/get-dictionary';
import type { AppShellNavSection } from './app-shell';

const ICON_SIZE = 18;
const ICON_STROKE = 1.75;

// Sem itens que só duplicam o site institucional (Nossa Loja, Diretoria
// pública, Contato) — esse é o papel do www.vl6.com.br, não do Portal
// (docs/architecture/07 §7.0). O admin foi reorganizado em 5 áreas
// consolidadas com abas internas (ver `area-tabs.ts`): Notícias e Usuários,
// que antes ficavam de fora da sidebar pra não virarem mais um item solto,
// agora estão visíveis como abas dentro de "Conteúdo" e "Pessoas & Loja"
// respectivamente — o custo de poluir a sidebar flat não existe mais
// depois da consolidação. Usuários continua sendo o caso excepcional
// (conta de acesso sem Irmão vinculado — o fluxo normal de acesso é criado
// dentro do cadastro de Irmãos, docs/architecture/06), só que agora visível
// em vez de escondido.
const PORTAL_ITEMS: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: PermissionKey;
}> = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/agenda', label: 'Minha Agenda', icon: CalendarDays },
  { href: '/avisos', label: 'Avisos', icon: Megaphone },
  // Módulo "Irmãos" (docs/architecture) — Diretório institucional privado e
  // voluntário + "Meu Espaço" (autoatendimento), unificados em duas abas
  // internas sob uma única rota. Sem `permission` aqui de propósito: "Meu
  // Espaço" nunca teve gate (é o autoatendimento de qualquer autenticado);
  // a aba "Diretório" checa `memberDirectory:read` sozinha e degrada com
  // uma mensagem explicativa em vez de esconder o item inteiro do menu.
  { href: '/irmaos', label: 'Irmãos', icon: Users },
];

// Entrada única do Acervo para o Irmão. Documentos, Biblioteca, Fotografias
// e Favoritos continuam com entidades, permissões e rotas próprias, mas são
// apresentados e pesquisados a partir de `/acervo`. As rotas antigas são
// preservadas para compatibilidade, links salvos e migração incremental.
const ACERVO_ITEM = { href: '/acervo', label: 'Acervo VL6', icon: Compass } as const;

interface AdminNavItemDef {
  href: string;
  labelKey: keyof Dictionary['nav'];
  icon: typeof LayoutDashboard;
  /** Array = visível se QUALQUER uma bater (item que agrega várias abas com recursos distintos). */
  permission: PermissionKey | PermissionKey[];
}

function hasAnyPermission(authContext: AuthContext, permission: PermissionKey | PermissionKey[]) {
  const permissions = Array.isArray(permission) ? permission : [permission];
  return permissions.some((p) => hasPermission(authContext, p));
}

const ADMIN_ITEMS: AdminNavItemDef[] = [
  { href: '/admin', labelKey: 'dashboard', icon: LayoutDashboard, permission: 'tenant:read' },
  {
    href: '/admin/pessoas',
    labelKey: 'pessoas',
    icon: Users,
    permission: ['member:read', 'user:read', 'boardTerm:read', 'role:read', 'branding:read'],
  },
  {
    href: '/admin/conteudo',
    labelKey: 'conteudo',
    icon: Megaphone,
    permission: ['announcement:read', 'news:read', 'event:read'],
  },
  {
    href: '/admin/acervo',
    labelKey: 'acervo',
    icon: GalleryIcon,
    permission: ['file:read', 'libraryItem:read', 'gallery:read'],
  },
  {
    href: '/admin/configuracoes',
    labelKey: 'settings',
    icon: Settings,
    permission: 'tenant:read',
  },
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
 * real — nunca escondidas só por CSS. O Acervo aparece como uma única área
 * de memória e conhecimento; "Administração" só para Administrador da
 * Loja/Geral, com cada item filtrado pela permissão específica.
 */
export function buildNavSections(
  authContext: AuthContext,
  role: Role | null,
  dictionary: Dictionary,
): AppShellNavSection[] {
  const sections: AppShellNavSection[] = [
    {
      title: 'Portal',
      items: PORTAL_ITEMS.filter(
        (item) => !item.permission || hasPermission(authContext, item.permission),
      ).map((item) => ({
        href: item.href,
        content: navContent(item.icon, item.label),
      })),
    },
    {
      title: 'Memória e conhecimento',
      items: [
        {
          href: ACERVO_ITEM.href,
          content: navContent(ACERVO_ITEM.icon, ACERVO_ITEM.label),
        },
      ],
    },
  ];

  if (isAdminTier(role)) {
    const visibleAdminItems = ADMIN_ITEMS.filter((item) =>
      hasAnyPermission(authContext, item.permission),
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
