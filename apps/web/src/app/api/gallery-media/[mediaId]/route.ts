import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { errorToLogContext, logger } from '@vl6/shared';
import { getCurrentSession } from '@/lib/auth/get-current-session';

export const runtime = 'nodejs';

/**
 * Proxy autenticado para o binário de um `GalleryMedia` (foto/vídeo da
 * Galeria e, agora, do Item do Acervo). Mesma motivação de
 * `/api/files/[fileId]`: o Vercel Blob só suporta `access: 'public'`, então
 * sem este proxy a URL do binário seria exposta direto no HTML. Até aqui a
 * Galeria expunha `GalleryMedia.url` crua (`<a href>`) — este proxy fecha
 * esse gap (Regra de Preservação nº7 da evolução do Acervo VL6).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> },
): Promise<Response> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.authContext, 'gallery:read')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const { mediaId } = await params;
    const container = createServerContainer();
    const media = await container.repositories.galleryMedia.findById(mediaId);
    if (
      !media ||
      media.tenantId !== session.authContext.tenantId ||
      media.deletedAt ||
      !media.ativo
    ) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const album = await container.repositories.galleryAlbum.findById(media.albumId);
    if (
      !album ||
      album.tenantId !== session.authContext.tenantId ||
      album.deletedAt ||
      !album.ativo
    ) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const upstream = await fetch(media.url);
    if (!upstream.ok || !upstream.body) {
      logger.error('Storage upstream indisponível ao servir mídia da Galeria', {
        route: 'GET /api/gallery-media/[mediaId]',
        mediaId,
        upstreamStatus: upstream.status,
      });
      return NextResponse.json({ error: 'storage_unavailable' }, { status: 502 });
    }

    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('content-type') ?? 'application/octet-stream');
    headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(album.titulo)}"`);
    headers.set('Cache-Control', 'private, no-store');

    return new NextResponse(upstream.body, { headers });
  } catch (error) {
    logger.error('Erro não tratado em GET /api/gallery-media/[mediaId]', {
      route: 'GET /api/gallery-media/[mediaId]',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'GET /api/gallery-media/[mediaId]' } });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
