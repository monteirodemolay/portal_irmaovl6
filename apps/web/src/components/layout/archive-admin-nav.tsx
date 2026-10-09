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
 * O Acervo possui várias ferramentas históricas. Esta navegação deixa explícito
 * o que é trabalho cotidiano, o que é fonte mestre e o que é manutenção/legado.
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
      href: '/admin/publicacoes',
      label: 'Memória por acontecimento',
      description: 'Fotos, vídeos e documentos de fatos datados devem entrar pela Ficha Única.',
      permission: ['event:read', 'archiveItem:create'],
    },
    {
      href: '/admin/acervo/biblioteca',
      label: 'Biblioteca',
      description: 'Obras, exemplares, circulação e patrimônio bibliográfico.',
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
      description: 'Curadorias e apresentações que referenciam itens já existentes.',
      permission: 'archiveExhibition:read',
    },
  ];

  const advanced: LinkDef[] = [
    {
      href: '/admin/acervo/publicar',
      label: 'Publicar item diretamente',
      description: 'Exceção para patrimônio sem acontecimento operacional apropriado.',
      permission: 'archiveItem:create',
    },
    {
      href: '/admin/acervo/arquivos',
      label: 'Documentos legados',
      description: 'Módulo anterior de arquivos; preservar e migrar com rastreabilidade.',
      permission: 'file:read',
    },
    {
      href: '/admin/acervo/galeria',
      label: 'Fotografias legadas',
      description: 'Galeria anterior; novos álbuns de acontecimentos devem nascer na Ficha.',
      permission: 'gallery:read',
    },
    {
      href: '/admin/acervo/catalogacao',
      label: 'Catalogação técnica',
      description: 'Metadados, revisão e tratamento especializado do patrimônio.',
      permission: 'archiveCatalog:read',
    },
    {
      href: '/admin/acervo/lixeira',
      label: 'Lixeira',
      description: 'Recuperação e revisão de itens arquivados/excluídos logicamente.',
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
      label: 'Métricas técnicas',
      description: 'Indicadores detalhados do Acervo para diagnóstico e manutenção.',
      permission: 'archiveMedia:manage',
    },
  ];

  const groups: ClassifiedAdminNavGroup[] = [
    {
      key: 'normal',
      title: 'Operação normal',
      description: 'Rotinas que fazem parte do trabalho cotidiano de memória e Biblioteca.',
      items: visible(normal, authContext, role),
    },
    {
      key: 'master',
      title: 'Cadastro mestre',
      description: 'Estruturas que relacionam ou apresentam itens já existentes sem duplicá-los.',
      items: visible(master, authContext, role),
    },
    {
      key: 'advanced',
      title: 'Administração avançada',
      description: 'Ferramentas técnicas, módulos legados, lixeira, deduplicação e catalogação.',
      items: visible(advanced, authContext, role),
    },
  ];

  return <ClassifiedAdminNav groups={groups} />;
}
