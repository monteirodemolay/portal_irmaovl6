// Fonte de verdade dos identificadores de RBAC — ver docs/architecture/08-permissoes-rbac.md.
// `roles` no Firestore é dado (permite papéis customizados por tenant); estas
// constantes descrevem apenas o *seed* de papéis padrão (`sistemico = true`)
// e o vocabulário fechado de recursos/ações que compõe uma PermissionKey.

export const SYSTEM_ROLE_KEYS = [
  'super_admin',
  'admin',
  'veneravel_mestre',
  'secretario',
  'tesoureiro',
  'diretoria',
  'comissao',
  'irmao',
  'visitante',
] as const;
export type RoleKey = (typeof SYSTEM_ROLE_KEYS)[number];

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
  veneravel_mestre: [
    'tenant:read',
    'branding:read',
    'member:read',
    'member:update',
    'boardTerm:manage',
    'committee:manage',
    'file:read',
    'file:create',
    'file:update',
    'libraryItem:read',
    'libraryItem:create',
    'libraryItem:update',
    'event:read',
    'event:create',
    'event:update',
    'news:read',
    'news:create',
    'news:update',
    'announcement:read',
    'announcement:create',
    'announcement:update',
    'gallery:read',
    'gallery:create',
    'gallery:update',
    'link:read',
    'link:create',
    'link:update',
  ],
  secretario: [
    'tenant:read',
    'member:read',
    'member:create',
    'member:update',
    'boardTerm:read',
    'boardTerm:create',
    'boardTerm:update',
    'committee:read',
    'committee:create',
    'committee:update',
    'file:read',
    'file:create',
    'file:update',
    'libraryItem:read',
    'libraryItem:create',
    'libraryItem:update',
    'event:read',
    'event:create',
    'event:update',
    'news:read',
    'news:create',
    'news:update',
    'announcement:read',
    'announcement:create',
    'announcement:update',
    'gallery:read',
    'gallery:create',
    'gallery:update',
    'link:read',
    'link:create',
    'link:update',
  ],
  tesoureiro: [
    'tenant:read',
    'member:read',
    'boardTerm:read',
    'committee:read',
    'file:read',
    'libraryItem:read',
    'event:read',
    'link:read',
  ],
  diretoria: [
    'tenant:read',
    'member:read',
    'boardTerm:read',
    'committee:read',
    'file:read',
    'file:create',
    'file:update',
    'libraryItem:read',
    'event:read',
    'event:create',
    'event:update',
    'news:read',
    'announcement:read',
    'gallery:read',
    'gallery:create',
    'gallery:update',
    'link:read',
    'link:create',
    'link:update',
  ],
  comissao: [
    'member:read',
    'committee:read',
    'file:read',
    'file:create',
    'file:update',
    'libraryItem:read',
    'event:read',
    'event:create',
    'event:update',
    'link:read',
  ],
  irmao: [
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
  visitante: ['news:read', 'event:read', 'gallery:read'],
};
