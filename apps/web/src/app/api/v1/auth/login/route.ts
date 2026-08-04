import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getAdminAuth, createServerContainer } from '@vl6/infra';
import {
  createSessionCookie,
  SESSION_COOKIE_MAX_AGE_MS,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

const bodySchema = z.object({ idToken: z.string().min(1) });

/**
 * Troca o ID Token do Firebase Authentication (client) por um cookie de
 * sessão HttpOnly e roda o pós-processamento de login do domínio —
 * docs/architecture/07-fluxo-autenticacao.md §7.2.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const current = await getCurrentTenant();
  if (!current) {
    return NextResponse.json({ error: 'tenant_not_found' }, { status: 404 });
  }

  const decoded = await getAdminAuth()
    .verifyIdToken(parsed.data.idToken)
    .catch(() => null);
  if (!decoded) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const container = createServerContainer();
  const result = await container.useCases.authenticateUser.execute({
    uid: decoded.uid,
    tenantId: current.tenant.id,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error.code, message: result.error.message },
      { status: 403 },
    );
  }

  const sessionCookie = await createSessionCookie(parsed.data.idToken);
  const response = NextResponse.json({ user: { uid: result.value.id, email: result.value.email } });
  response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_MS / 1000,
  });
  return response;
}
