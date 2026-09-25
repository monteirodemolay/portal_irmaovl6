import 'server-only';
import { createServerContainer } from '@vl6/infra';
import { getCurrentSession } from '@/lib/auth/get-current-session';

export async function activeCriptaSession() {
  const session = await getCurrentSession();
  if (!session) return null;
  const container = createServerContainer();
  const member = await container.repositories.member.findByUserId(session.authContext.tenantId, session.user.id);
  return member?.situacao === 'ativo' ? session : null;
}
