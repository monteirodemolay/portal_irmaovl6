import 'server-only';
import { notFound } from 'next/navigation';
import { hasPermission } from '@vl6/domain';
import type { PermissionKey } from '@vl6/shared';
import { requireSession } from './require-session';
import type { CurrentSession } from './get-current-session';

/**
 * Exige sessão válida E a permissão informada — usado no topo de páginas
 * administrativas (Server Component). `notFound()` em vez de uma mensagem
 * de "acesso negado": não revela a existência da rota a quem não pode vê-la.
 */
export async function requirePagePermission(permission: PermissionKey): Promise<CurrentSession> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, permission)) {
    notFound();
  }
  return session;
}
