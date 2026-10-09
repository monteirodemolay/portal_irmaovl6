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
 * Navegação de apoio do Acervo. Galeria, Arquivos e publicação direta
 * continuam existentes por compatibilidade, mas não são mais portas de
 * entrada expostas: saneamento e migração acontecem pela Central do Acervo.
 */
export function ArchiveAdminNav({
  authContext,
  role,
}: {
  authContext: AuthContext;
  role: Role | null;
}) {
  const normal: LinkDef[] = [
    {
      href: '/admin/acervo',
      label: 'Central do Acervo',
      description: 'Acompanhamento, saneamento, auditoria e acesso às memórias canônicas.',
      permission: ['archiveItem:read', 'archiveItem:create'],
    },
    {
      href: '/admin/publicacoes',
      label: 'Acontecimentos e memórias',
      description: 'Fotos, vídeos e documentos de fatos datados entram pela Ficha Única.',
      permission: ['event:read', 'archiveItem:create'],
    },
    {
      href: '/admin/acervo/biblioteca',
      label: 'Biblioteca',
      description: 'Domínio próprio para obras, exemplares, circulação e patrimônio bibliográfico.',
      permission: 'libraryItem:read',
    },
    {
      href: '/admin/acervo/contribuicoes',
      label: 'Contribuições recebidas',
      description: 'Triagem do material enviado pelos Irmãos antes da incorporação ao Acervo.',
      permission: 'archiveContribution:manage',
    },
  ];

  const master: LinkDef[] = [
    {
      href: '/admin/acervo/relacoes',
      label: 'Relações',
      description: 'Vínculos estruturados entre itens, pessoas, eventos e outros registros.',
      permission: 'archiveRelation:read',
    },
    {
      href: '/admin/acervo/exposicoes',
      label: 'Exposições',
      description: 'Apresentações curatoriais que referenciam itens já existentes, sem duplicá-los.',
      permission: 'archiveExhibition:read',
    },
  ];

  const advanced: LinkDef[] = [
    {
      href: '/admin/acervo#migracao',
      label: 'Saneamento e migração',
      description: 'Interliga Galeria e Arquivos legados ao acontecimento correto com proveniência preservada.',
      permission: ['archiveItem:create', 'gallery:read', 'file:read'],
    },
    {
      href: '/admin/acervo/catalogacao',
      label: 'Catalogação técnica',
      description: 'Metadados, revisão e tratamento especializado do patrimônio.',
      permission: 'archiveCatalog:read',
    },
    {
      href: '/admin/acervo/lixeira',
      label: 'Lixeira e restauração',
      description: 'Recuperação e revisão de itens arquivados ou excluídos logicamente.',
      permission: 'archiveItem:delete',
    },
    {
      href: '/admin/acervo/duplicidade',
      label: 'Duplicidades',
      description: 'Conferência técnica de mídias potencialmente repetidas.',
      permission: 'archiveMedia:manage',
    },
    {
      href: '/admin/acervo/metricas',
      label: 'Diagnóstico técnico',
      description: 'Indicadores detalhados do Acervo para conferência e manutenção.',
      permission: 'archiveMedia:manage',
    },
  ];

  const groups: ClassifiedAdminNavGroup[] = [
    {
      key: 'normal',
      title: 'Operação normal',
      description: 'Rotinas cotidianas do Acervo, centradas em acontecimentos e registros canônicos.',
      items: visible(normal, authContext, role),
    },
    {
      key: 'master',
      title: 'Cadastro mestre',
      description: 'Estruturas que relacionam ou apresentam itens existentes sem recriar o conteúdo.',
      items: visible(master, authContext, role),
    },
    {
      key: 'advanced',
      title: 'Administração avançada',
      description: 'Saneamento, restauração, deduplicação e catalogação. Rotas legadas continuam funcionando apenas por compatibilidade.',
      items: visible(advanced, authContext, role),
    },
  ];

  return <ClassifiedAdminNav groups={groups} />;
}
