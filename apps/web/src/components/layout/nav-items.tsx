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
  Settings,
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
// (docs/architecture/07 §7.0). O admin foi reorganizado em 5 áreas
// consolidadas com abas internas (ver `area-tabs.ts`): Notícias e Usuários,
// que antes ficavam de fora da sidebar pra não virarem mais um item solto,
// agora estão visíveis como abas dentro de "Conteúdo" e "Pessoas & Loja"
// respectivamente — o custo de poluir a sidebar flat não existe mais
// depois da consolidação. Usuários continua sendo o caso excepcional
// (conta de acesso sem Irmão vinculado — o fluxo normal de acesso é criado
// dentro do cadastro de Irmãos, docs/architecture/06), só que agora visível
// em vez de escondido.
const PORTAL_ITEMS = [
  { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/perfil', label: 'Meu Perfil', icon: UserCircle },
  { href: '/agenda', label: 'Agenda', icon: CalendarDays },
  { href: '/avisos', label: 'Avisos', icon: Megaphone },
] as const;

// Arquivos, Biblioteca, Galeria e Downloads continuam sendo entidades e
// rotas separadas no domínio (Biblioteca cataloga `FileAsset`s, nunca
// duplica o binário — ver `LibraryItem`), mas para o Irmão elas formam um
// único espaço: o Acervo Digital. Agrupá-las numa seção própria (em vez de
// 4 itens soltos misturados com Agenda/Avisos) resolve a confusão de IA de
// navegação identificada na auditoria, sem mexer no modelo de dados nem
// nas rotas existentes. Rótulos alinhados aos títulos das próprias páginas
// (`AcervoPageHeader`).
const ACERVO_ITEMS = [
  { href: '/arquivos', label: 'Documentos', icon: FileText },
  { href: '/biblioteca', label: 'Biblioteca', icon: BookOpen },
  { href: '/galeria', label: 'Fotografias', icon: GalleryIcon },
  { href: '/downloads', label: 'Favoritos', icon: Download },
] as const;

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
    // Visível se qualquer uma das 5 abas internas (Irmãos/Usuários/Gestões/
    // Permissões/Loja — ver `area-tabs.ts`) estiver disponível. Usuários
    // volta a aparecer na navegação aqui pelo mesmo motivo de Notícias em
    // "Conteúdo": o custo de item solto na sidebar flat some dentro de uma
    // área já visível — mas a tela continua deixando claro que é o caso
    // excepcional (conta de acesso sem Irmão vinculado), não o fluxo normal.
    permission: ['member:read', 'user:read', 'boardTerm:read', 'role:read', 'branding:read'],
  },
  {
    href: '/admin/conteudo',
    labelKey: 'conteudo',
    icon: Megaphone,
    // Visível se qualquer uma das 3 abas internas (Avisos/Notícias/Agenda —
    // ver `area-tabs.ts`) estiver disponível pra sessão atual. Notícias
    // volta a aparecer na navegação aqui (antes ficava de fora pra não
    // poluir a sidebar flat — esse custo some ao virar aba de uma área já
    // visível).
    permission: ['announcement:read', 'news:read', 'event:read'],
  },
  {
    href: '/admin/acervo',
    labelKey: 'acervo',
    icon: GalleryIcon,
    // Visível se qualquer uma das 3 abas internas (Arquivos/Biblioteca/
    // Galeria — ver `area-tabs.ts`) estiver disponível pra sessão atual.
    permission: ['file:read', 'libraryItem:read', 'gallery:read'],
  },
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
 * real — nunca escondidas só por CSS. "Portal" e "Acervo Digital" aparecem
 * pra qualquer autenticado; "Administração" só pra Administrador da
 * Loja/Geral, com cada item ainda filtrado pela permissão específica (mesma
 * regra de `admin/layout.tsx`); "Sistema" só pro Administrador Geral,
 * apontando pro painel `/plataforma` que já existe — nenhuma tela nova
 * inventada aqui.
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
    {
      title: 'Acervo Digital',
      items: ACERVO_ITEMS.map((item) => ({
        href: item.href,
        content: navContent(item.icon, item.label),
      })),
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
