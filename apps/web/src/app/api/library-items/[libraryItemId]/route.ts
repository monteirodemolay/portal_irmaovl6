import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { errorToLogContext, logger } from '@vl6/shared';
import { getCurrentSession } from '@/lib/auth/get-current-session';

export const runtime = 'nodejs';

/**
 * Proxy autenticado para o binário referenciado por um `LibraryItem`
 * (Biblioteca e Downloads). Mesma motivação de `/api/files/[fileId]` — a URL
 * do Vercel Blob nunca chega ao cliente — mas usa os casos de uso de
 * `library` (não os de `document-management`), porque a Biblioteca tem suas
 * próprias regras/contadores: `permiteLeituraOnline` é uma condição extra
 * para "Ler online" que não existe em Arquivos, e as contagens de
 * visualização/download ficam no `LibraryItem`, não no `FileAsset`
 * subjacente (docs/architecture/06 — camada de curadoria não duplica o
 * binário nem seus contadores de Arquivos).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ libraryItemId: string }> },
): Promise<Response> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.authContext, 'libraryItem:read')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { libraryItemId } = await params;
    const container = createServerContainer();
    const item = await container.repositories.libraryItem.findById(libraryItemId);
    if (!item || item.tenantId !== session.authContext.tenantId || item.deletedAt || !item.ativo) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const file = await container.repositories.fileAsset.findById(item.fileId);
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

    const interactionResult =
      mode === 'download'
        ? await container.useCases.recordLibraryDownload.execute(session.authContext, libraryItemId)
        : await container.useCases.recordLibraryView.execute(session.authContext, libraryItemId);
    if (!interactionResult.ok) {
      const status = interactionResult.error.code === 'forbidden' ? 403 : 404;
      return NextResponse.json({ error: interactionResult.error.code }, { status });
    }

    const upstream = await fetch(file.urlArquivo);
    if (!upstream.ok || !upstream.body) {
      logger.error('Storage upstream indisponível ao servir item da Biblioteca', {
        route: 'GET /api/library-items/[libraryItemId]',
        libraryItemId,
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
    logger.error('Erro não tratado em GET /api/library-items/[libraryItemId]', {
      route: 'GET /api/library-items/[libraryItemId]',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'GET /api/library-items/[libraryItemId]' } });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
