import 'server-only';
import { redirect } from 'next/navigation';
import { getCurrentSession, type CurrentSession } from './get-current-session';

/** Redireciona para /login se não houver sessão válida — uso em Server Components protegidos. */
export async function requireSession(): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}
