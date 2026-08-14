import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { buildIcsContent, errorToLogContext, logger } from '@vl6/shared';
import { getCurrentSession } from '@/lib/auth/get-current-session';

export const runtime = 'nodejs';

/**
 * Serve o `.ics` de um evento da Agenda pra importar em Outlook/Apple
 * Calendar/etc. Nunca acessa a agenda pessoal do Irmão — é um arquivo
 * estático que o próprio app de calendário do usuário importa.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
): Promise<Response> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.authContext, 'event:read')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { eventId } = await params;
    const container = createServerContainer();
    const event = await container.repositories.event.findById(eventId);
    if (!event || event.tenantId !== session.authContext.tenantId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const ics = buildIcsContent(event, `${event.id}@portal.vl6.com.br`);
    const headers = new Headers();
    headers.set('Content-Type', 'text/calendar; charset=utf-8');
    headers.set('Content-Disposition', `attachment; filename="${event.id}.ics"`);
    headers.set('Cache-Control', 'private, no-store');

    return new NextResponse(ics, { headers });
  } catch (error) {
    logger.error('Erro não tratado em GET /api/agenda/[eventId]/ics', {
      route: 'GET /api/agenda/[eventId]/ics',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'GET /api/agenda/[eventId]/ics' } });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
