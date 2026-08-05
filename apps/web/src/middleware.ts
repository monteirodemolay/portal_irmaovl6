import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from './lib/auth/session-constants';

export const TENANT_HOST_HEADER = 'x-tenant-host';

// /noticias e /diretoria ficam de fora: são conteúdo institucional público
// (site público), acessíveis sem login mesmo quando também linkados a
// partir da Área do Irmão.
const PROTECTED_PREFIXES = ['/dashboard', '/perfil', '/avisos', '/admin'];

/**
 * Roda em Edge runtime — por isso não usa o Admin SDK aqui (incompatível
 * com Edge). Apenas: (1) propaga o host para os Server Components
 * resolverem o tenant via `ResolveTenantByHostUseCase`
 * (docs/architecture/07-fluxo-autenticacao.md §7.1); (2) faz um guard
 * barato de presença de cookie de sessão — a verificação criptográfica real
 * acontece no layout (Node.js runtime), que redireciona se o cookie for
 * inválido.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(TENANT_HOST_HEADER, host);

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

  if (isProtected && !hasSessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
