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

export function PeopleAdminNav({
  authContext,
  role,
}: {
  authContext: AuthContext;
  role: Role | null;
}) {
  const master: LinkDef[] = [
    {
      href: '/admin/pessoas/irmaos',
      label: 'Irmãos',
      description: 'Cada Irmão possui uma única ficha para cadastro, situação, acesso, perfil, consentimento e histórico.',
      permission: 'member:read',
    },
    {
      href: '/admin/pessoas/gestoes',
      label: 'Gestões',
      description: 'Fonte única dos períodos e nominatas reutilizados por acontecimentos e Acervo.',
      permission: 'boardTerm:read',
    },
    {
      href: '/admin/pessoas/paramaconicas',
      label: 'Paramaçônicas',
      description: 'Entidades relacionadas que são referenciadas pelos acontecimentos e pela comunidade.',
      permission: 'paramasonicEntity:read',
    },
    {
      href: '/admin/pessoas/loja',
      label: 'Loja',
      description: 'Identidade institucional e dados mestres do tenant.',
      permission: 'branding:read',
    },
  ];

  const extensions: LinkDef[] = [
    {
      href: '/admin/pessoas/central',
      label: 'Central VL6',
      description: 'Extensão do cadastro do Irmão; usa o mesmo Member e não cria outra pessoa.',
      permission: 'memberCentral:manage',
    },
    {
      href: '/admin/pessoas/negocios',
      label: 'Negócios & Serviços',
      description: 'Informações profissionais vinculadas ao mesmo cadastro do Irmão.',
      permission: 'memberCentral:manage',
    },
  ];

  const advanced: LinkDef[] = [
    {
      href: '/admin/pessoas/usuarios',
      label: 'Usuários e acesso',
      description: 'Conta de login; não substitui nem duplica o cadastro do Irmão.',
      permission: 'user:read',
    },
    {
      href: '/admin/pessoas/permissoes',
      label: 'Papéis e permissões',
      description: 'Autorização e RBAC do Portal.',
      permission: 'role:read',
    },
    {
      href: '/admin/pessoas/situacao-migracao',
      label: 'Migração de situação',
      description: 'Ferramenta de manutenção e reconciliação histórica.',
      permission: 'member:update',
    },
  ];

  const groups: ClassifiedAdminNavGroup[] = [
    {
      key: 'normal',
      title: 'Extensões do cadastro',
      description: 'Recursos de uso cotidiano que complementam o Irmão sem criar um segundo cadastro.',
      items: visible(extensions, authContext, role),
    },
    {
      key: 'master',
      title: 'Cadastro mestre',
      description: 'Pessoas e entidades existem uma única vez e são reutilizadas em todo o Portal.',
      items: visible(master, authContext, role),
    },
    {
      key: 'advanced',
      title: 'Administração avançada',
      description: 'Acesso, permissões e manutenção técnica; não são cadastros paralelos de pessoas.',
      items: visible(advanced, authContext, role),
    },
  ];

  return <ClassifiedAdminNav groups={groups} />;
}
