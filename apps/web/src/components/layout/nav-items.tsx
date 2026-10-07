import { hasPermission, type AuthContext, type Role } from '@vl6/domain';
import type { PermissionKey } from '@vl6/shared';
import {
  Building2,
  CalendarDays,
  Compass,
  GraduationCap,
  Globe,
  Handshake,
  LayoutDashboard,
  Megaphone,
  Newspaper,
  Lock,
  Settings,
  Users,
} from '@vl6/ui';
import { isAdminTier } from '@/lib/auth/is-admin-tier';
import type { Dictionary } from '@/lib/i18n/get-dictionary';
import type { AppShellNavFlyout, AppShellNavSection } from './app-shell';

const ICON_SIZE = 18;
const ICON_STROKE = 1.75;

// Sem itens que só duplicam o site institucional (Nossa Loja, Diretoria
// pública, Contato) — esse é o papel do www.vl6.com.br, não do Portal
// (docs/architecture/07 §7.0). Notícias e Links Úteis são conteúdo do
// PRÓPRIO Portal (`Notícia`/`Link` cadastrados pelo admin, não uma cópia do
// site institucional) que tinha rota funcionando mas nenhuma entrada de
// menu — corrigido aqui, sem mexer nas páginas em si. O admin foi
// reorganizado em 5 áreas
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
  { href: '/avisos', label: 'Central de Notificações', icon: Megaphone },
  // Módulo "Irmãos" (docs/architecture) — Diretório institucional privado e
  // voluntário + "Meu Espaço" (autoatendimento), unificados em duas abas
  // internas sob uma única rota. A entrada exige `memberDirectory:read` para
  // não oferecer o Diretório maçônico completo a convidados paramaçônicos.
  { href: '/irmaos', label: 'Irmãos', icon: Users, permission: 'memberDirectory:read' },
  {
    href: '/paramaconicas',
    label: 'Paramaçônicas',
    icon: Handshake,
    permission: 'paramasonicCommunity:read',
  },
  // Sem `permission`: notícia publicada é conteúdo público (papel Visitante
  // já tem `news:read`, ver a própria página).
  { href: '/noticias', label: 'Notícias', icon: Newspaper },
  { href: '/links-uteis', label: 'Links Úteis', icon: Globe, permission: 'link:read' },
  // Rota pessoal, distinta de `/admin/configuracoes` (administração do
  // tenant) — Fase 4 da Central de Avisos (docs/architecture). Sem
  // `permission`: é autoatendimento de qualquer autenticado, mesmo padrão
  // de "Meu Espaço". Fora de `/irmaos/*` de propósito: se ficasse sob esse
  // prefixo, clicar em "Configurações" também ativava/expandia o item
  // "Irmãos" na sidebar (o match de rota ativa é por prefixo).
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

// Entrada única do Acervo para o Irmão. Documentos, Biblioteca, Fotografias
// e Favoritos continuam com entidades, permissões e rotas próprias, mas são
// apresentados e pesquisados a partir de `/acervo`. As rotas antigas são
// preservadas para compatibilidade, links salvos e migração incremental.
const ACERVO_ITEM = { href: '/acervo', label: 'Acervo VL6', icon: Compass } as const;

function navContent(Icon: typeof LayoutDashboard, label: string, badge?: number) {
  return (
    <>
      <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} />
      <span className="flex-1">{label}</span>
      {Boolean(badge) && (
        <em className="bg-accent text-primary-dark flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold not-italic">
          {badge}
        </em>
      )}
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
  _dictionary: Dictionary,
  unreadNotificationsCount = 0,
  isActiveCriptaMember = false,
): AppShellNavSection[] {
  const irmaosFlyout: AppShellNavFlyout = {
    title: 'Irmãos',
    description: 'Diretório e autoatendimento',
    links: [
      { href: '/irmaos/meu-espaco', label: 'Meu Perfil (editar dados)' },
      { href: '/irmaos/negocios', label: 'Meus Negócios & Serviços' },
      { href: '/irmaos/galeria-de-honra', label: 'Galeria de Honra' },
      { href: '/configuracoes#perfil-diretorio', label: 'Privacidade e visibilidade' },
    ],
    full: { href: '/irmaos', label: 'Ver diretório completo' },
    fullPosition: 'first',
  };

  const acervoFlyout: AppShellNavFlyout = {
    title: ACERVO_ITEM.label,
    description: 'Memória e conhecimento',
    links: [
      { href: '/acervo/documentos', label: 'Documentos' },
      { href: '/acervo/biblioteca', label: 'Biblioteca' },
      { href: '/acervo/fotografias', label: 'Fotos e vídeos' },
      { href: '/acervo/gestoes', label: 'Gestões' },
      { href: '/downloads', label: 'Favoritos' },
      { href: '/acervo/pesquisar', label: 'Pesquisar tudo' },
    ],
    full: { href: ACERVO_ITEM.href, label: 'Abrir Acervo completo' },
    fullPosition: 'first',
  };

  const sections: AppShellNavSection[] = [
    {
      title: 'Portal',
      items: PORTAL_ITEMS.filter(
        (item) => !item.permission || hasPermission(authContext, item.permission),
      ).map((item) => ({
        href: item.href,
        content: navContent(
          item.icon,
          item.label,
          item.href === '/avisos' ? unreadNotificationsCount : undefined,
        ),
        flyout: item.href === '/irmaos' ? irmaosFlyout : undefined,
      })),
    },
  ];

  const memoryItems: AppShellNavSection['items'] = [];
  if (hasPermission(authContext, 'archiveItem:read')) {
    memoryItems.push({
      href: ACERVO_ITEM.href,
      content: navContent(ACERVO_ITEM.icon, ACERVO_ITEM.label),
      flyout: acervoFlyout,
    });
  }
  // Entrada aditiva: Acervo e Biblioteca mantêm rotas, menu e comportamentos.
  // O backend confirma cadastro e grau, independentemente das claims antigas.
  if (hasPermission(authContext, 'member:read') || hasPermission(authContext, 'knowledge:read')) {
    memoryItems.push({
      href: '/conhecimento',
      content: navContent(GraduationCap, 'Conhecimento VL6'),
      flyout: {
        title: 'Conhecimento VL6',
        description: 'Formação continuada',
        full: { href: '/conhecimento', label: 'Visão geral' },
        fullPosition: 'first',
        links: [
          { href: '/conhecimento/minha-jornada', label: 'Minha jornada' },
          { href: '/conhecimento/formacoes', label: 'Formações' },
          { href: '/conhecimento/rapido', label: 'Conhecimento rápido' },
          { href: '/conhecimento/atividades', label: 'Atividades' },
          { href: '/conhecimento/progresso', label: 'Meu progresso' },
        ],
      },
    });
  }
  if (memoryItems.length) sections.push({ title: 'Memória e conhecimento', items: memoryItems });

  if (isActiveCriptaMember) {
    const items = [];
    if (isActiveCriptaMember)
      items.push({ href: '/cripta', content: navContent(Lock, 'Minhas cartas') });
    sections.push({ title: 'Cripta', items });
  }

  if (isAdminTier(role)) {
    sections.push({
      title: 'Administração',
      items: [{ href: '/admin', content: navContent(LayoutDashboard, 'Central de Administração') }],
    });
  }

  if (role?.chave === 'super_admin') {
    sections.push({
      title: 'Sistema',
      items: [
        {
          href: '/plataforma',
          content: navContent(Building2, 'Painel da Plataforma'),
          flyout: {
            title: 'Painel da Plataforma',
            description: 'Gestão multi-tenant',
            links: [{ href: '/plataforma/lojas/nova', label: 'Cadastrar nova Loja' }],
            full: { href: '/plataforma', label: 'Abrir Painel da Plataforma' },
          },
        },
      ],
    });
  }

  return sections;
}
