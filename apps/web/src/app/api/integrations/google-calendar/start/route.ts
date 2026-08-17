import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createServerContainer } from '@vl6/infra';
import { errorToLogContext, logger } from '@vl6/shared';
import { getCurrentSession } from '@/lib/auth/get-current-session';

export const runtime = 'nodejs';

const ROUTE = 'GET /api/integrations/google-calendar/start';

/**
 * Primeiro hop do OAuth2 (`connectGoogleCalendar()`) — redireciona ao
 * Google. Rota session-based do próprio Portal (não faz parte da API
 * pública `/api/v1`, que é autenticada por API Key).
 */
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const container = createServerContainer();
    const authorizationUrl = container.useCases.startGoogleConnection.execute(session.authContext);
    return NextResponse.redirect(authorizationUrl);
  } catch (error) {
    logger.error('Erro ao iniciar conexão Google Calendar', {
      route: ROUTE,
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: ROUTE } });
    const redirectTo = new URL('/agenda', request.url);
    redirectTo.searchParams.set('google', 'error');
    return NextResponse.redirect(redirectTo);
  }
}
