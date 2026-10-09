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

/** Navegação consolidada do ciclo Acontecimento → derivados → Acervo. */
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
      description: 'Cadastre o fato uma única vez; notícia, mídia e Acervo derivam da mesma ficha.',
      permission: 'event:create',
    },
    {
      href: '/admin/conteudo/agenda',
      label: 'Calendário e presença',
      description: 'Visão cronológica dos fatos e controle de presença quando aplicável.',
      permission: 'event:read',
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
      href: '/admin/conteudo/noticias',
      label: 'Notícias sem vínculo ou legadas',
      description: 'Revisão e reconciliação de matérias que ainda não apontam para um acontecimento.',
      permission: 'news:read',
    },
    {
      href: '/admin/conteudo/avisos',
      label: 'Avisos sem vínculo ou legados',
      description: 'Conferência de avisos antigos ou realmente independentes de acontecimento.',
      permission: 'announcement:read',
    },
    {
      href: '/admin/comunicacao',
      label: 'Fila técnica de comunicação',
      description: 'Distribuição e registros excepcionais que não nasceram de um acontecimento.',
      permission: 'communication:manage',
    },
    {
      href: '/admin/acervo#migracao',
      label: 'Saneamento do Acervo',
      description: 'Migração e interligação de Galeria/Arquivos antigos à memória canônica.',
      permission: ['archiveItem:create', 'gallery:read', 'file:read'],
    },
    {
      href: '/admin/conteudo/notificacoes/nova',
      label: 'Notificação independente',
      description: 'Mensagem administrativa que não representa um acontecimento histórico.',
      permission: 'notification:manage',
    },
  ];

  const groups: ClassifiedAdminNavGroup[] = [
    {
      key: 'normal',
      title: 'Operação normal',
      description: 'Caminho padrão: registre o fato no Calendário e trabalhe seus derivados pela Ficha Única.',
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
      description: 'Exceções, legado e saneamento. Fica recolhida para não competir com o fluxo principal.',
      items: visible(advanced, authContext, role),
    },
  ];

  return <ClassifiedAdminNav groups={groups} />;
}
