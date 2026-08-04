import { NextResponse, type NextRequest } from 'next/server';
import { revokeAllSessions, SESSION_COOKIE_NAME, verifySessionCookie } from '@/lib/auth/session';

/**
 * Revoga a sessão corrente — inclusive sessões antigas do mesmo usuário
 * (docs/architecture/07-fluxo-autenticacao.md §7.8), não apenas o cookie
 * local.
 */
export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookie) {
    const decoded = await verifySessionCookie(cookie);
    if (decoded) {
      await revokeAllSessions(decoded.uid);
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
