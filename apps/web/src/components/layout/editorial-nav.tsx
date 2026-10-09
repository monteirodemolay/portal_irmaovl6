import { hasPermission, type AuthContext, type Role } from '@vl6/domain';
import type { PermissionKey } from '@vl6/shared';
import { isAdminPathAllowed } from '@/lib/auth/is-admin-tier';
import {
  ClassifiedAdminNav,
  type ClassifiedAdminNavGroup,
  type ClassifiedAdminNavItem,
} from './classified-admin-nav';

type LinkDef = ClassifiedAdminNavItem & {
  permission: PermissionKey | PermissionKey[];
};

function visible(
  links: LinkDef[],
  authContext: AuthContext,
  role: Role | null,
): ClassifiedAdminNavItem[] {
  return links
    .filter(
      (link) =>
        isAdminPathAllowed(role, link.href) &&
        (Array.isArray(link.permission) ? link.permission : [link.permission]).some((permission) =>
          hasPermission(authContext, permission),
        ),
    )
    .map(({ href, label, description }) => ({ href, label, description }));
}

/**
 * Navegação consolidada do ciclo Acontecimento → Conteúdo → Comunicação → Acervo.
 * As rotas antigas continuam acessíveis, mas deixam de ter o mesmo peso visual.
 */
export function EditorialNav({
  authContext,
  role,
}: {
  authContext: AuthContext;
  role: Role | null;
}) {
  const normal: LinkDef[] = [
    {
      href: '/admin/publicacoes',
      label: 'Acontecimentos',
      description: 'Entrada principal, acompanhamento e Ficha Única de cada fato.',
      permission: [
        'event:read',
        'announcement:read',
        'news:read',
        'communication:manage',
        'archiveItem:create',
      ],
    },
    {
      href: '/admin/publicacoes/novo',
      label: 'Registrar acontecimento',
      description: 'Cadastre o fato uma única vez e continue pela Ficha Única.',
      permission: 'event:create',
    },
  ];

  const master: LinkDef[] = [
    {
      href: '/admin/comunicacao/modelos',
      label: 'Modelos de comunicação',
      description: 'Templates reutilizados pelas publicações e artes.',
      permission: 'communication:manage',
    },
    {
      href: '/admin/conteudo/frases',
      label: 'Frases',
      description: 'Conteúdo independente, sem vínculo obrigatório com acontecimento.',
      permission: 'quote:read',
    },
    {
      href: '/admin/conteudo/links',
      label: 'Links úteis',
      description: 'Referências institucionais mantidas como cadastro próprio.',
      permission: 'link:read',
    },
  ];

  const advanced: LinkDef[] = [
    {
      href: '/admin/conteudo/agenda',
      label: 'Agenda técnica',
      description: 'Manutenção direta de eventos existentes e exceções de Agenda.',
      permission: 'event:read',
    },
    {
      href: '/admin/conteudo/avisos',
      label: 'Avisos avulsos/legados',
      description: 'Conferência de avisos fora da Ficha ou ainda sem vínculo.',
      permission: 'announcement:read',
    },
    {
      href: '/admin/conteudo/noticias',
      label: 'Notícias avulsas/legadas',
      description: 'Revisão, importação e reconciliação de matérias fora da Ficha.',
      permission: 'news:read',
    },
    {
      href: '/admin/comunicacao',
      label: 'Central técnica de comunicação',
      description: 'Fila editorial, distribuição e registros não originados em Evento.',
      permission: 'communication:manage',
    },
    {
      href: '/admin/acervo/publicar',
      label: 'Publicação técnica do Acervo',
      description: 'Uso excepcional para conteúdo histórico que não nasce pela Ficha.',
      permission: 'archiveItem:create',
    },
    {
      href: '/admin/conteudo/notificacoes/nova',
      label: 'Notificação independente',
      description: 'Mensagem administrativa que não representa um acontecimento.',
      permission: 'notification:manage',
    },
  ];

  const groups: ClassifiedAdminNavGroup[] = [
    {
      key: 'normal',
      title: 'Operação normal',
      description: 'Caminho padrão do administrador. Comece sempre pelo acontecimento quando existir um fato datado.',
      items: visible(normal, authContext, role),
    },
    {
      key: 'master',
      title: 'Cadastro mestre',
      description: 'Fontes reutilizáveis que existem uma única vez e são referenciadas pelos demais módulos.',
      items: visible(master, authContext, role),
    },
    {
      key: 'advanced',
      title: 'Administração avançada',
      description: 'Legado, exceções e manutenção. Não é a porta de entrada normal para novos acontecimentos.',
      items: visible(advanced, authContext, role),
    },
  ];

  return <ClassifiedAdminNav groups={groups} />;
}
