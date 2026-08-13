import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { errorToLogContext, logger } from '@vl6/shared';
import { getCurrentSession } from '@/lib/auth/get-current-session';

export const runtime = 'nodejs';

/**
 * Proxy autenticado para o binário de um `FileAsset` (Arquivos, Biblioteca e
 * Downloads apontam todos para cá). O Vercel Blob só suporta `access:
 * 'public'` — sem este proxy, `FileAsset.urlArquivo` seria uma URL pública
 * permanente exposta direto no HTML, acessível por qualquer pessoa com o
 * link mesmo sem sessão, mesmo após despublicação. Aqui a URL real do Blob
 * nunca chega ao cliente: validamos sessão + tenant + permissão a cada
 * requisição e fazemos stream do conteúdo já autenticado.
 *
 * `?mode=download` exige `permitirDownload`; qualquer outro valor (ou
 * ausência) é tratado como visualização (mesma regra de `file:read` que já
 * vale para a listagem).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
): Promise<Response> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.authContext, 'file:read')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { fileId } = await params;
    const container = createServerContainer();
    const file = await container.repositories.fileAsset.findById(fileId);
    if (
      !file ||
      file.tenantId !== session.authContext.tenantId ||
      file.deletedAt ||
      !file.ativo ||
      !file.publicado
    ) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const mode = request.nextUrl.searchParams.get('mode') === 'download' ? 'download' : 'view';
    if (mode === 'download' && !file.permitirDownload) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const interactionResult =
      mode === 'download'
        ? await container.useCases.recordFileDownload.execute(session.authContext, fileId)
        : await container.useCases.recordFileView.execute(session.authContext, fileId);
    if (!interactionResult.ok) {
      const status = interactionResult.error.code === 'forbidden' ? 403 : 404;
      return NextResponse.json({ error: interactionResult.error.code }, { status });
    }

    const upstream = await fetch(file.urlArquivo);
    if (!upstream.ok || !upstream.body) {
      logger.error('Storage upstream indisponível ao servir arquivo', {
        route: 'GET /api/files/[fileId]',
        fileId,
        upstreamStatus: upstream.status,
      });
      return NextResponse.json({ error: 'storage_unavailable' }, { status: 502 });
    }

    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('content-type') ?? 'application/octet-stream');
    const disposition = mode === 'download' ? 'attachment' : 'inline';
    headers.set(
      'Content-Disposition',
      `${disposition}; filename="${encodeURIComponent(file.titulo)}"`,
    );
    headers.set('Cache-Control', 'private, no-store');

    return new NextResponse(upstream.body, { headers });
  } catch (error) {
    logger.error('Erro não tratado em GET /api/files/[fileId]', {
      route: 'GET /api/files/[fileId]',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'GET /api/files/[fileId]' } });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
