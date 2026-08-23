import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { hasPermission } from '@vl6/domain';
import { createServerContainer, VercelBlobStorageAdapter } from '@vl6/infra';
import { errorToLogContext, logger } from '@vl6/shared';
import { getCurrentSession } from '@/lib/auth/get-current-session';

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
    const media = await container.repositories.archiveMedia.findById(archiveMediaId);
    if (!media || media.tenantId !== session.authContext.tenantId || media.deletedAt) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Miniatura de vídeo (Fase B "Publicação avançada") — `?variant=poster`
    // serve o `MediaAsset` da miniatura em vez do binário principal, mesmo
    // proxy autenticado (nunca a URL crua do Vercel Blob para nenhum dos dois).
    const variant = request.nextUrl.searchParams.get('variant');
    const mediaAssetId =
      variant === 'poster' ? (media.posterMediaAssetId ?? null) : media.mediaAssetId;
    if (!mediaAssetId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Visualização — Fase C "Administração & métricas". Só o binário
    // principal conta como visualização (a miniatura de vídeo é um detalhe
    // técnico de exibição, não um acesso independente ao conteúdo).
    if (variant !== 'poster') {
      const viewResult = await container.useCases.recordArchiveMediaView.execute(
        session.authContext,
        media.id,
      );
      if (!viewResult.ok) {
        const status = viewResult.error.code === 'forbidden' ? 403 : 404;
        return NextResponse.json({ error: viewResult.error.code }, { status });
      }
    }

    const asset = await container.repositories.mediaAsset.findById(mediaAssetId);
    if (!asset || asset.tenantId !== session.authContext.tenantId || asset.deletedAt) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const storage = new VercelBlobStorageAdapter();
    let downloadUrl: string;
    try {
      downloadUrl = await storage.getDownloadUrl(asset.storageKey);
    } catch (storageError) {
      logger.error('Storage indisponível ao resolver a URL da mídia do Acervo', {
        route: 'GET /api/archive-media/[archiveMediaId]',
        archiveMediaId,
        ...errorToLogContext(storageError),
      });
      return NextResponse.json({ error: 'storage_unavailable' }, { status: 502 });
    }
    const upstream = await fetch(downloadUrl);
    if (!upstream.ok || !upstream.body) {
      logger.error('Storage upstream indisponível ao servir mídia do Acervo', {
        route: 'GET /api/archive-media/[archiveMediaId]',
        archiveMediaId,
        upstreamStatus: upstream.status,
      });
      return NextResponse.json({ error: 'storage_unavailable' }, { status: 502 });
    }

    const headers = new Headers();
    headers.set('Content-Type', asset.mimeType || 'application/octet-stream');
    headers.set(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(asset.originalName)}"`,
    );
    headers.set('Cache-Control', 'private, no-store');

    return new NextResponse(upstream.body, { headers });
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
