import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createServerContainer } from '@vl6/infra';
import { errorToLogContext, logger } from '@vl6/shared';
import { getCurrentSession } from '@/lib/auth/get-current-session';

export const runtime = 'nodejs';

const ROUTE = 'GET /api/integrations/google-calendar/callback';

/**
 * Segundo hop do OAuth2 — recebido do Google com `code`/`state`. Junto com
 * a rota `start`, implementa `connectGoogleCalendar()`. Sempre redireciona
 * de volta para "Minha Agenda" com `?google=connected|error` — nunca deixa
 * o usuário preso numa página de erro solta.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const redirectTo = new URL('/agenda', request.url);
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    if (!code || !state) {
      redirectTo.searchParams.set('google', 'error');
      return NextResponse.redirect(redirectTo);
    }

    const container = createServerContainer();
    const result = await container.useCases.completeGoogleConnection.execute(
      session.authContext,
      code,
      state,
    );
    if (!result.ok) {
      logger.warn('Falha ao concluir conexão Google Calendar', {
        route: ROUTE,
        errorCode: result.error.code,
      });
      redirectTo.searchParams.set('google', 'error');
      return NextResponse.redirect(redirectTo);
    }

    redirectTo.searchParams.set('google', 'connected');
    return NextResponse.redirect(redirectTo);
  } catch (error) {
    logger.error('Erro não tratado no callback do Google Calendar', {
      route: ROUTE,
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: ROUTE } });
    redirectTo.searchParams.set('google', 'error');
    return NextResponse.redirect(redirectTo);
  }
}
