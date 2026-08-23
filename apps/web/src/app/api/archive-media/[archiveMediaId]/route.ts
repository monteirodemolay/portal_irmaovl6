import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { errorToLogContext, logger } from '@vl6/shared';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { fetchArchiveMediaBinary } from '@/modules/archive/lib/fetch-archive-media-binary';

export const runtime = 'nodejs';

/**
 * Proxy autenticado para o binário de uma `ArchiveMedia` (Fase 3,
 * docs/architecture/11-acervo-vl6.md §11.6) — mesma motivação de
 * `/api/gallery-media/[mediaId]`: o Vercel Blob só suporta `access:
 * 'public'`, então sem este proxy o `storageKey`/URL do binário seria
 * exposto direto no HTML das telas de organização (miniaturas de
 * fotografias, preview de documentos). `MediaAsset` guarda só `storageKey`
 * (não uma URL pronta), então resolve via `VercelBlobStorageAdapter.
 * getDownloadUrl` antes de buscar o binário.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ archiveMediaId: string }> },
): Promise<Response> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.authContext, 'archiveMedia:read')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { archiveMediaId } = await params;
    const container = createServerContainer();

    // Miniatura de vídeo (Fase B "Publicação avançada") — `?variant=poster`
    // serve o `MediaAsset` da miniatura em vez do binário principal, mesmo
    // proxy autenticado (nunca a URL crua do Vercel Blob para nenhum dos dois).
    const variant =
      request.nextUrl.searchParams.get('variant') === 'poster' ? 'poster' : 'original';
    const binary = await fetchArchiveMediaBinary(
      container,
      session.authContext.tenantId,
      archiveMediaId,
      variant,
    );
    if (!binary.ok) {
      if (binary.status === 502) {
        logger.error('Storage indisponível ao servir mídia do Acervo', {
          route: 'GET /api/archive-media/[archiveMediaId]',
          archiveMediaId,
        });
      }
      return NextResponse.json(
        { error: binary.status === 404 ? 'not_found' : 'storage_unavailable' },
        { status: binary.status },
      );
    }

    const headers = new Headers();
    headers.set('Content-Type', binary.mimeType);
    headers.set(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(binary.originalName)}"`,
    );
    headers.set('Cache-Control', 'private, no-store');

    return new NextResponse(binary.webStream, { headers });
  } catch (error) {
    logger.error('Erro não tratado em GET /api/archive-media/[archiveMediaId]', {
      route: 'GET /api/archive-media/[archiveMediaId]',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, {
      tags: { route: 'GET /api/archive-media/[archiveMediaId]' },
    });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
