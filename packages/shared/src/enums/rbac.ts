// Fonte de verdade dos identificadores de RBAC — ver docs/architecture/08-permissoes-rbac.md.
// `roles` no Firestore é dado (permite papéis customizados por tenant); estas
// constantes descrevem apenas o *seed* de papéis padrão (`sistemico = true`)
// e o vocabulário fechado de recursos/ações que compõe uma PermissionKey.

export const SYSTEM_ROLE_KEYS = ['super_admin', 'admin', 'membro'] as const;
export type RoleKey = (typeof SYSTEM_ROLE_KEYS)[number];

// `super_admin` não pertence a nenhum tenant (docs/architecture/08 §8.3) —
// vive sozinho sob `PLATFORM_TENANT_ID`, nunca no seed de fábrica de uma
// Loja. Os outros 2 (`admin`, `membro`) são os papéis de fábrica criados
// por `CreateTenantUseCase`. Cargo institucional (Venerável Mestre,
// Secretário, Tesoureiro etc. — `BoardPositionKey`, packages/shared/src/
// enums/governance.ts) é um conceito à parte, sem relação com o papel de
// acesso do usuário: um Secretário pode ser `membro` ou receber `admin`,
// conforme decisão de quem administra a Loja.
export const TENANT_SYSTEM_ROLE_KEYS = SYSTEM_ROLE_KEYS.filter((key) => key !== 'super_admin');

// tenantId sentinela do Administrador Geral (cross-tenant, uso interno da
// plataforma) — nunca um documento real na coleção `tenants`.
export const PLATFORM_TENANT_ID = 'platform';

export const RESOURCE_KEYS = [
  'tenant',
  'branding',
  'member',
  'boardTerm',
  'committee',
  'file',
  'libraryItem',
  'event',
  'news',
  'announcement',
  'gallery',
  'link',
  'user',
  'role',
  'auditLog',
] as const;
export type ResourceKey = (typeof RESOURCE_KEYS)[number];

export const ACTION_KEYS = [
  'create',
  'read',
  'update',
  'delete',
  'publish',
  'export',
  'manage',
] as const;
export type ActionKey = (typeof ACTION_KEYS)[number];

export type PermissionKey = `${ResourceKey}:${ActionKey}`;

export function isPermissionKey(value: string): value is PermissionKey {
  const [resource, action] = value.split(':');
  return (
    RESOURCE_KEYS.includes(resource as ResourceKey) && ACTION_KEYS.includes(action as ActionKey)
  );
}

/**
 * Seed de fábrica aplicado a todo novo tenant — ver matriz completa em
 * docs/architecture/08-permissoes-rbac.md §8.2. `manage` implica todas as
 * ações sobre o recurso; papéis sem entrada para um recurso não têm acesso.
 * Só 3 níveis: `super_admin` (Administrador Geral, cross-tenant — todas as
 * ações sobre tudo), `admin` (Administrador da Loja — todas as ações
 * dentro do próprio tenant) e `membro` (Irmão — só leitura). Quem precisa
 * de mais que leitura sem ser Administrador da Loja recebe `admin` mesmo;
 * não há nível intermediário de fábrica (tenants podem criar papéis
 * customizados com `sistemico = false` se precisarem de um).
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  super_admin: [...RESOURCE_KEYS.map((resource) => `${resource}:manage` as PermissionKey)],
  admin: [
    'tenant:manage',
    'branding:manage',
    'member:manage',
    'boardTerm:manage',
    'committee:manage',
    'file:manage',
    'libraryItem:manage',
    'event:manage',
    'news:manage',
    'announcement:manage',
    'gallery:manage',
    'link:manage',
    'user:manage',
    'role:manage',
    'auditLog:read',
  ],
  membro: [
    'tenant:read',
    'member:read',
    'boardTerm:read',
    'committee:read',
    'file:read',
    'libraryItem:read',
    'event:read',
    'news:read',
    'announcement:read',
    'gallery:read',
    'link:read',
  ],
};
