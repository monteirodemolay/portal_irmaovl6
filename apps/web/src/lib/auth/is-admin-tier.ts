import type { Role } from '@vl6/domain';

/**
 * Papel de fábrica `admin`/`super_admin`, ou papel customizado com alguma
 * permissão além de leitura. Usado tanto pro gate de `/admin/*` quanto pra
 * decidir se a seção "Administração" aparece na sidebar — nunca escondida
 * só por CSS.
 */
export function isAdminTier(role: Role | null): boolean {
  if (!role) return false;
  if (role.sistemico) return role.chave === 'admin' || role.chave === 'super_admin';
  return role.permissoes.some((permission) => !permission.endsWith(':read'));
}
