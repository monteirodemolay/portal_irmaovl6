import 'server-only';
import { cookies } from 'next/headers';
import { createServerContainer } from '@vl6/infra';
import type { Role, User } from '@vl6/domain';
import { buildAuthContext } from './build-auth-context';
import { SESSION_COOKIE_NAME, verifySessionCookie } from './session';

export interface CurrentSession {
  user: User;
  role: Role | null;
  authContext: ReturnType<typeof buildAuthContext>;
}

/** Lê e valida o cookie de sessão da requisição atual. `null` se ausente/inválido/expirado. */
export async function getCurrentSession(): Promise<CurrentSession | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;

  const decoded = await verifySessionCookie(cookie);
  if (!decoded) return null;

  const container = createServerContainer();
  const user = await container.repositories.user.findById(decoded.uid);
  if (!user || user.statusConta !== 'active') return null;

  const role = await container.repositories.role.findById(user.roleId);

  return { user, role, authContext: buildAuthContext(decoded) };
}
