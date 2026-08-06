import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@vl6/shared';
import { getAdminAuth, createServerContainer } from '@vl6/infra';
import { getClientIp } from '@/lib/api/get-client-ip';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { rateLimitResponse } from '@/lib/api/rate-limit-response';
import { RateLimiter } from '@/lib/api/rate-limiter';
import { withApiLogging } from '@/lib/api/with-api-logging';
import { resolvePostLoginDestination } from '@/lib/auth/resolve-post-login-destination';
import {
  createSessionCookie,
  SESSION_COOKIE_MAX_AGE_MS,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { loginBodySchema } from './schema';

const ROUTE = 'POST /api/v1/auth/login';

// Alvo clássico de força bruta — o limite mais apertado da API. Por IP (não
// por e-mail): o ID Token já provou posse da conta no Firebase Auth antes
// de chegar aqui, então o risco real é tentativa repetida contra tenants
// diferentes ou contas diferentes a partir da mesma origem.
const loginRateLimiter = new RateLimiter();

/**
 * Troca o ID Token do Firebase Authentication (client) por um cookie de
 * sessão HttpOnly e roda o pós-processamento de login do domínio —
 * docs/architecture/07-fluxo-autenticacao.md §7.2.
 */
export const POST = withApiLogging(ROUTE, async (request: NextRequest) => {
  const ip = getClientIp(request);
  const limit = loginRateLimiter.check(ip, { limit: 10, windowMs: 5 * 60 * 1000 });
  if (!limit.allowed) {
    logger.warn('Rate limit atingido em login', { route: ROUTE, ip });
    return rateLimitResponse(limit);
  }

  const parsed = loginBodySchema.safeParse(await parseJsonBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  // Host próprio de uma Loja: exige que a conta pertença a ela. Host que
  // não resolve (ex.: domínio compartilhado da Vercel, usado como portão
  // de login unificado — docs/architecture/07 §7.9): confia no tenant do
  // próprio usuário, resolvido dentro de `authenticateUser`.
  const current = await getCurrentTenant();
  const hostTenantId = current?.tenant.id ?? null;

  const decoded = await getAdminAuth()
    .verifyIdToken(parsed.data.idToken)
    .catch(() => null);
  if (!decoded) {
    logger.warn('Tentativa de login com ID Token inválido', { route: ROUTE, hostTenantId });
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const container = createServerContainer();
  const result = await container.useCases.authenticateUser.execute({
    uid: decoded.uid,
    tenantId: hostTenantId,
  });

  if (!result.ok) {
    logger.warn('Login negado', {
      route: ROUTE,
      hostTenantId,
      uid: decoded.uid,
      errorCode: result.error.code,
    });
    return NextResponse.json(
      { error: result.error.code, message: result.error.message },
      { status: 403 },
    );
  }

  const role = await container.repositories.role.findById(result.value.roleId);
  const redirectTo = resolvePostLoginDestination(result.value.tenantId, role);

  const sessionCookie = await createSessionCookie(parsed.data.idToken);
  const response = NextResponse.json({
    user: { uid: result.value.id, email: result.value.email },
    redirectTo,
  });
  response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_MS / 1000,
  });
  return response;
});
