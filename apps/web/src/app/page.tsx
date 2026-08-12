import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { resolvePostLoginDestination } from '@/lib/auth/resolve-post-login-destination';

/**
 * Sem landing page institucional — esse papel é do site público
 * (www.vl6.com.br), não do Portal (docs/architecture/07 §7.0). `/` só
 * decide pra onde mandar: sem sessão, `/login`; com sessão, o mesmo
 * destino por papel do pós-login (`resolvePostLoginDestination`).
 */
export default async function RootPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect('/login');
  }
  redirect(resolvePostLoginDestination(session.authContext.tenantId, session.role));
}
