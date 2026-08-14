import type { UserAccountStatus } from '@vl6/domain';

/** Fonte única dos rótulos de status de acesso — usada em /admin/pessoas/usuarios e /admin/pessoas/irmaos/[id]. */
export const USER_STATUS_VARIANT: Record<
  UserAccountStatus,
  'default' | 'success' | 'warning' | 'destructive'
> = {
  active: 'success',
  pending: 'warning',
  blocked: 'destructive',
};

export const USER_STATUS_LABEL: Record<UserAccountStatus, string> = {
  active: 'Ativa',
  pending: 'Pendente',
  blocked: 'Bloqueada',
};
